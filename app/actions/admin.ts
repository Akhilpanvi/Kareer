'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { hashPassword, tempPassword } from '@/lib/password'
import { refreshUser } from '@/lib/platforms'
import type { State } from '@/lib/form'
import { User } from '@/models/User'

const valid = (id: string) => /^[a-f0-9]{24}$/.test(id)

export async function resetPassword(id: string): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  const password = tempPassword()
  const r = await User.updateOne(
    { _id: id, role: 'student' },
    { $set: { passwordHash: await hashPassword(password), failedLogins: 0 }, $unset: { lockedUntil: 1 }, $inc: { sessionVersion: 1 } },
  )
  return r.modifiedCount ? { ok: 'Temporary password issued. It will not be shown again.', secret: password } : { error: 'Student not found.' }
}

export async function setActive(id: string, active: boolean): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  await User.updateOne({ _id: id, role: 'student' }, { $set: { active }, $inc: { sessionVersion: 1 } })
  revalidatePath('/admin', 'layout')
  return { ok: active ? 'Account enabled.' : 'Account disabled.' }
}

export async function refreshStudent(id: string): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  const n = await refreshUser(id, true)
  revalidatePath('/admin', 'layout')
  return n ? { ok: `Synced ${n} platform${n > 1 ? 's' : ''}.` } : { error: 'Synced recently. Try again later.' }
}
