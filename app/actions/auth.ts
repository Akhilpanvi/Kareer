'use server'
import { createHash, randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { db } from '@/lib/db'
import { endSession, requireUser, startSession } from '@/lib/auth'
import { hashPassword, passwordIssue, verifyPassword } from '@/lib/password'
import { str, type State } from '@/lib/form'
import { appUrl, resetEmail, resetEnabled, sendMail } from '@/lib/mail'
import { User } from '@/models/User'

const LOCK_AFTER = 5
const LOCK_MS = 15 * 60_000

export async function login(_: State, fd: FormData): Promise<State> {
  const id = str(fd, 'id', 120)
  const password = String(fd.get('password') ?? '').slice(0, 128)
  if (!id || !password) return { error: 'Enter your registration number or email and password.' }

  await db()
  const user = await User.findOne(id.includes('@') ? { email: id.toLowerCase() } : { regNo: id.toUpperCase() })
    .select('+passwordHash role active sessionVersion failedLogins lockedUntil')
  if (user?.lockedUntil && user.lockedUntil > new Date()) return { error: 'Too many failed attempts. Try again in 15 minutes.' }

  const valid = await verifyPassword(password, user?.passwordHash)
  if (!user || !valid || !user.active) {
    if (user)
      await User.updateOne(
        { _id: user._id },
        user.failedLogins + 1 >= LOCK_AFTER
          ? { $set: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } }
          : { $inc: { failedLogins: 1 } },
      )
    return { error: user && valid && !user.active ? 'This account is disabled. Contact the Placement Cell.' : 'Invalid credentials.' }
  }

  await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: 1 } })
  await startSession({ _id: user._id, role: user.role as 'student' | 'admin', sessionVersion: user.sessionVersion })
  redirect(user.role === 'admin' ? '/admin' : '/dashboard')
}

export async function logout() {
  await endSession()
  redirect('/login')
}

export async function changePassword(_: State, fd: FormData): Promise<State> {
  const me = await requireUser()
  const [current, next, confirm] = ['current', 'next', 'confirm'].map(k => String(fd.get(k) ?? ''))
  const issue = passwordIssue(next)
  if (issue) return { error: issue }
  if (next !== confirm) return { error: 'New passwords do not match.' }

  const user = await User.findById(me._id).select('+passwordHash role sessionVersion')
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { error: 'Current password is incorrect.' }
  user.passwordHash = await hashPassword(next)
  user.sessionVersion += 1
  await user.save()
  await startSession({ _id: user._id, role: user.role as 'student' | 'admin', sessionVersion: user.sessionVersion })
  return { ok: 'Password updated. Other devices have been signed out.' }
}

const RESET_TTL = 30 * 60_000
const RESET_GAP = 5 * 60_000
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

/** Always answers the same way so the form can't be used to discover accounts. */
export async function requestReset(_: State, fd: FormData): Promise<State> {
  if (!resetEnabled()) return { error: 'Password reset by email is not available. Contact the Placement Cell.' }
  const id = str(fd, 'id', 120)
  if (!id) return { error: 'Enter your registration number or email.' }
  const sent = { ok: 'If an account matches, we have emailed a reset link to its address. The link expires in 30 minutes.' }

  await db()
  const user = await User.findOne(id.includes('@') ? { email: id.toLowerCase() } : { regNo: id.toUpperCase() }).select('name email active resetRequestedAt').lean()
  if (!user?.active || (user.resetRequestedAt && Date.now() - +user.resetRequestedAt < RESET_GAP)) return sent

  const token = randomBytes(32).toString('base64url')
  await User.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_TTL), resetRequestedAt: new Date() } },
  )
  const mail = resetEmail(user.name, `${appUrl()}/reset-password?token=${token}`)
  after(() => sendMail({ to: user.email, ...mail }).catch(e => console.error('reset email failed:', e)))
  return sent
}

export async function resetWithToken(_: State, fd: FormData): Promise<State> {
  const token = str(fd, 'token', 100)
  const [next, confirm] = ['next', 'confirm'].map(k => String(fd.get(k) ?? ''))
  const issue = passwordIssue(next)
  if (issue) return { error: issue }
  if (next !== confirm) return { error: 'Passwords do not match.' }

  await db()
  const user = await User.findOneAndUpdate(
    { resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } },
    {
      $set: { passwordHash: await hashPassword(next), failedLogins: 0 },
      $unset: { resetTokenHash: 1, resetTokenExpires: 1, lockedUntil: 1 },
      $inc: { sessionVersion: 1 },
    },
  ).select('_id').lean()
  if (!token || !user) return { error: 'This reset link is invalid, already used, or expired. Request a new one.' }
  redirect('/login?reset=1')
}
