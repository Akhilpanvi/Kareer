import 'server-only'
import type { Types } from 'mongoose'
import { PLATFORM_KEYS, PLATFORMS } from './platforms'
import type { Fetched } from './platforms/types'
import { User } from '@/models/User'

export const REQUIRED = ['github', 'leetcode', 'codechef']
export const platformFields = () => PLATFORM_KEYS.map(key => ({ key, label: PLATFORMS[key].label, required: REQUIRED.includes(key) }))
export const registrationEnabled = () => process.env.REGISTRATION !== 'off'
export const EMAIL_DOMAIN = (process.env.EMAIL_DOMAIN ?? 'kluniversity.in').toLowerCase()
export const emailFor = (regNo: string) => `${regNo.toLowerCase()}@${EMAIL_DOMAIN}`

const CHECKS_PER_DAY = 60

/** Atomic per-account daily cap on live username checks. */
export async function takeCheck(user: Types.ObjectId | string) {
  const today = new Date().toISOString().slice(0, 10)
  const r = await User.updateOne(
    { _id: user, $or: [{ checkDay: { $ne: today } }, { checkCount: { $lt: CHECKS_PER_DAY } }] },
    [{ $set: { checkCount: { $cond: [{ $eq: ['$checkDay', today] }, { $add: ['$checkCount', 1] }, 1] }, checkDay: today } }],
    { updatePipeline: true },
  )
  return r.modifiedCount === 1
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function summary(platform: string, r: Fetched) {
  const d = r.data as any
  if (platform === 'github') return `${d.name || 'Found'} · ${r.metrics.ghRepos ?? 0} public repos`
  if (platform === 'leetcode') return `${d.name || 'Found'} · ${d.solved?.all ?? 0} solved`
  if (platform === 'codechef') return `Rating ${d.rating} · ${d.stars}★`
  return `Rating ${d.rating} · ${d.rank}`
}

export function profileGaps(handles: Record<string, string> | undefined, resume: string | null | undefined, stats: { platform: string; status?: string | null }[]) {
  const gaps = REQUIRED.filter(p => !handles?.[p] || stats.find(s => s.platform === p)?.status === 'not_found').map(p => PLATFORMS[p].label)
  for (const p of PLATFORM_KEYS) if (!REQUIRED.includes(p) && handles?.[p] && stats.find(s => s.platform === p)?.status === 'not_found') gaps.push(PLATFORMS[p].label)
  if (!resume) gaps.push('Resume link')
  return gaps
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(3, local.length - 3))}${local.slice(-1)}@${domain}`
}

const slugOf = (name: string) => name.trim().split(/\s+/).map(w => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean).join('_').slice(0, 60) || 'student'

/** Public profile slug from the student's name, with the reg. no tail appended if taken. */
export async function ensureSlug(id: Types.ObjectId | string, name: string, regNo: string) {
  const base = slugOf(name)
  for (const candidate of [base, `${base}_${regNo.slice(-4)}`, `${base}_${regNo}`]) {
    const taken = await User.exists({ slug: candidate, _id: { $ne: id } })
    if (!taken) {
      await User.updateOne({ _id: id }, { $set: { slug: candidate } })
      return candidate
    }
  }
  return null
}
