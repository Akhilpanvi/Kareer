'use server'
import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { db } from '@/lib/db'
import { currentUser, endSession, requireAdmin, startSession } from '@/lib/auth'
import { hashPassword, passwordIssue, verifyPassword } from '@/lib/password'
import { EMAIL, str, type State } from '@/lib/form'
import { appUrl, resetEmail, resetEnabled, sendMail } from '@/lib/mail'
import { User } from '@/models/User'

const LOCK_AFTER = 5
const LOCK_MS = 15 * 60_000

function unavailable(where: string, e: unknown): State {
  console.error(`${where} failed:`, e)
  return { error: 'Sign-in is temporarily unavailable. Please try again shortly.' }
}

export async function login(_: State, fd: FormData): Promise<State> {
  const id = str(fd, 'id', 120)
  const password = String(fd.get('password') ?? '').slice(0, 128)
  if (!id || !password) return { error: 'Enter your email and password.' }

  let to: string
  try {
    await db()
    const user = await User.findOne({ email: id.toLowerCase() })
      .select('+passwordHash role active sessionVersion failedLogins lockedUntil mustChangePassword')
    if (user?.lockedUntil && user.lockedUntil > new Date()) return { error: 'Too many failed attempts. Try again in 15 minutes.' }

    const valid = await verifyPassword(password, user?.passwordHash)
    if (user && !user.passwordHash) return { error: 'You haven\'t set up your account yet. Use "Create account" with your registration number.' }
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

    after(() => User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: 1 } }))
    await startSession({ _id: user._id, role: user.role as 'student' | 'admin', sessionVersion: user.sessionVersion })
    to = user.mustChangePassword ? '/change-password' : user.role === 'admin' ? '/admin' : '/dashboard'
  } catch (e) {
    return unavailable('login', e)
  }
  redirect(to)
}

export async function logout() {
  await endSession()
  redirect('/login')
}

export async function changePassword(_: State, fd: FormData): Promise<State> {
  const me = await currentUser()
  if (!me) redirect('/login')
  const [current, next, confirm] = ['current', 'next', 'confirm'].map(k => String(fd.get(k) ?? ''))
  const issue = passwordIssue(next)
  if (issue) return { error: issue }
  if (next !== confirm) return { error: 'New passwords do not match.' }

  const user = await User.findById(me._id).select('+passwordHash role sessionVersion')
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { error: 'Current password is incorrect.' }
  if (current === next) return { error: 'Choose a password different from your current one.' }
  user.passwordHash = await hashPassword(next)
  user.mustChangePassword = false
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
  if (!id) return { error: 'Enter your email.' }
  const sent = { ok: 'If an account matches, we have emailed a reset link to its address. The link expires in 30 minutes.' }

  try {
    await db()
    const user = await User.findOne({ email: id.toLowerCase() }).select('name email active resetRequestedAt').lean()
    if (!user?.active || (user.resetRequestedAt && Date.now() - +user.resetRequestedAt < RESET_GAP)) return sent

    const token = randomBytes(32).toString('base64url')
    await User.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_TTL), resetRequestedAt: new Date() } },
    )
    const mail = resetEmail(user.name, `${appUrl()}/reset-password?token=${token}`)
    after(() => sendMail({ to: user.email, ...mail }).catch(e => console.error('reset email failed:', e)))
  } catch (e) {
    return unavailable('reset request', e)
  }
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
      $set: { passwordHash: await hashPassword(next), failedLogins: 0, mustChangePassword: false },
      $unset: { resetTokenHash: 1, resetTokenExpires: 1, lockedUntil: 1 },
      $inc: { sessionVersion: 1 },
    },
  ).select('_id').lean()
  if (!token || !user) return { error: 'This reset link is invalid, already used, or expired. Request a new one.' }
  redirect('/login?reset=1')
}

/** Admin edits their own name and email. Changing the email (the sign-in ID) needs the current password. */
export async function updateAccount(_: State, fd: FormData): Promise<State> {
  const me = await requireAdmin()
  const name = str(fd, 'name', 120)
  const email = str(fd, 'email', 120).toLowerCase()
  if (!name) return { error: 'Name is required.' }
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' }

  const user = await User.findById(me._id).select('+passwordHash email')
  if (!user) return { error: 'Account not found.' }
  const emailChanged = email !== user.email
  if (emailChanged && !(await verifyPassword(String(fd.get('current') ?? ''), user.passwordHash)))
    return { error: 'Enter your current password to change your email.' }

  user.name = name
  user.email = email
  try {
    await user.save()
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { error: 'Another account already uses this email.' }
    throw e
  }
  revalidatePath('/', 'layout')
  return { ok: emailChanged ? `Saved. Sign in with ${email} from now on.` : 'Saved.' }
}

/** Forced first sign-in (or after an issued temporary password): set a password, then continue. */
export async function setFirstPassword(_: State, fd: FormData): Promise<State> {
  const me = await currentUser()
  if (!me) redirect('/login')
  const result = await changePassword(null, fd)
  if (result?.error) return result
  redirect(me.role === 'admin' ? '/admin' : '/dashboard')
}
