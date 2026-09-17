'use server'
import type { Types } from 'mongoose'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentUser, startSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { HANDLE, Invalid, REGNO, str } from '@/lib/form'
import { ensureSlug, maskEmail, REQUIRED, registrationEnabled, summary, takeCheck } from '@/lib/onboarding'
import { hashPassword, passwordIssue } from '@/lib/password'
import { PLATFORM_KEYS, PLATFORMS, recompute, verifyAndStore } from '@/lib/platforms'
import { seal, unseal } from '@/lib/session'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'

type Ticket = { reg: string; purpose: 'register' }
export type Preview = { ticket: string; name: string; regNo: string; email: string; branch?: string | null; batch?: string | null }
export type Check = { found: true; summary: string } | { found: false; error?: string }

const url = /^https?:\/\/[^\s<>"]+\.[^\s<>"]+$/i
const clean = (v: string) => v.trim().replace(/^https?:\/\/[^/]+\/(u\/|users\/|profile\/)?/i, '').split(/[/?#]/)[0].replace(/^@/, '').slice(0, 40)

async function unclaimed(ticket: string) {
  const t = await unseal<Ticket>(ticket)
  if (t?.purpose !== 'register') return null
  return User.findOne({ _id: t.reg, role: 'student', active: true, passwordHash: { $exists: false } }).select('_id').lean()
}

async function subject(ticket?: string) {
  await db()
  if (ticket) return (await unclaimed(ticket))?._id ?? null
  const me = await currentUser()
  return me?.role === 'student' ? me._id : null
}

export async function lookupRegNo(regNo: string): Promise<{ error: string } | Preview> {
  if (!registrationEnabled()) return { error: 'Registration is closed. Contact the Placement Cell.' }
  const reg = regNo.trim().toUpperCase().slice(0, 20)
  if (!REGNO.test(reg)) return { error: 'Enter your registration number.' }
  await db()
  const u = await User.findOne({ regNo: reg, role: 'student' }).select('+passwordHash name regNo email branch batch active').lean()
  if (!u) return { error: "This registration number isn't in the Placement Cell list. Contact the Placement Cell." }
  if (u.passwordHash) return { error: 'This account is already set up. Sign in, or use "Forgot password".' }
  if (!u.active) return { error: 'This account is disabled. Contact the Placement Cell.' }
  return { ticket: await seal<Ticket>({ reg: String(u._id), purpose: 'register' }, 30 * 60), name: u.name, regNo: u.regNo, email: maskEmail(u.email), branch: u.branch, batch: u.batch }
}

export async function checkHandle(platform: string, value: string, ticket?: string): Promise<Check> {
  if (!PLATFORMS[platform]) return { found: false, error: 'Unknown platform.' }
  const handle = clean(value)
  if (!HANDLE.test(handle)) return { found: false, error: 'Enter a valid username.' }
  const user = await subject(ticket)
  if (!user) return { found: false, error: 'Your session expired. Start again.' }
  if (!(await takeCheck(user))) return { found: false, error: 'Too many checks today. Try again tomorrow.' }
  try {
    const r = await verifyAndStore(user, platform, handle)
    return r ? { found: true, summary: summary(platform, r) } : { found: false, error: `No ${PLATFORMS[platform].label} account named "${handle}".` }
  } catch {
    return { found: false, error: `Couldn't reach ${PLATFORMS[platform].label} right now. Try again in a moment.` }
  }
}

/** Validate handles + links from the form; every username must exist (reuses checks from the last 30 minutes). */
async function collect(user: Types.ObjectId, fd: FormData) {
  const handles: Record<string, string> = {}
  for (const p of PLATFORM_KEYS) {
    const h = clean(str(fd, p, 200))
    if (!h) {
      if (REQUIRED.includes(p)) throw new Invalid(`${PLATFORMS[p].label} username is required.`)
      continue
    }
    if (!HANDLE.test(h)) throw new Invalid(`Enter a valid ${PLATFORMS[p].label} username.`)
    handles[p] = h
  }
  const resume = str(fd, 'resume', 300)
  const portfolio = str(fd, 'portfolio', 300)
  if (!url.test(resume)) throw new Invalid('Add a valid resume link (https://…).')
  if (portfolio && !url.test(portfolio)) throw new Invalid('Portfolio must be a valid link (https://…).')

  const recent = new Date(Date.now() - 30 * 60_000)
  const stats = await PlatformStat.find({ user, platform: { $in: Object.keys(handles) } }).select('platform handle status checkedAt').lean()
  const missing: string[] = []
  await Promise.all(Object.entries(handles).map(async ([p, h]) => {
    const s = stats.find(x => x.platform === p)
    if (s?.handle === h && s.status === 'ok' && s.checkedAt! > recent) return
    try {
      if (!(await verifyAndStore(user, p, h))) missing.push(`${PLATFORMS[p].label} "${h}"`)
    } catch {
      throw new Invalid(`Couldn't reach ${PLATFORMS[p].label} to verify your username. Try again in a moment.`)
    }
  }))
  if (missing.length) throw new Invalid(`Not found: ${missing.join(', ')}. Check the username${missing.length > 1 ? 's' : ''}.`)
  await PlatformStat.deleteMany({ user, platform: { $nin: Object.keys(handles) } })
  return { handles, resume, portfolio: portfolio || undefined }
}

const failed = (e: unknown) => {
  if (e instanceof Invalid) return { error: e.message }
  throw e
}

export async function finishRegistration(ticket: string, fd: FormData): Promise<{ error: string } | undefined> {
  let userId
  try {
    await db()
    const u = await unclaimed(ticket)
    if (!u) return { error: 'This registration expired or was already completed. Start again.' }
    const password = String(fd.get('password') ?? '')
    const issue = passwordIssue(password)
    if (issue) return { error: issue }
    if (password !== String(fd.get('confirm') ?? '')) return { error: 'Passwords do not match.' }
    const { handles, resume, portfolio } = await collect(u._id, fd)
    const claimed = await User.findOneAndUpdate(
      { _id: u._id, passwordHash: { $exists: false } },
      { $set: { passwordHash: await hashPassword(password), handles, 'links.resume': resume, 'links.portfolio': portfolio, registeredAt: new Date(), mustChangePassword: false, lastLoginAt: new Date() } },
      { returnDocument: 'after' },
    ).select('role sessionVersion name regNo').lean()
    if (!claimed) return { error: 'This account was already set up. Sign in instead.' }
    await ensureSlug(claimed._id, claimed.name, claimed.regNo)
    await recompute(claimed._id)
    await startSession({ _id: claimed._id, role: 'student', sessionVersion: claimed.sessionVersion })
    userId = claimed._id
  } catch (e) {
    return failed(e)
  }
  if (userId) redirect('/dashboard')
}

export async function completeProfile(fd: FormData): Promise<{ error: string } | { ok: string }> {
  try {
    const me = await currentUser()
    if (me?.role !== 'student') return { error: 'Sign in as a student.' }
    const { handles, resume, portfolio } = await collect(me._id, fd)
    await User.updateOne({ _id: me._id }, { $set: { handles, 'links.resume': resume, 'links.portfolio': portfolio } })
    await recompute(me._id)
    revalidatePath('/', 'layout')
    return { ok: 'Profile completed.' }
  } catch (e) {
    return failed(e)
  }
}
