'use server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { endSession, requireUser, startSession } from '@/lib/auth'
import { hashPassword, passwordIssue, verifyPassword } from '@/lib/password'
import { str, type State } from '@/lib/form'
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
