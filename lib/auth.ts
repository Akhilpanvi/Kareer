import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from './db'
import { cookieName, MAX_AGE, sign, verify } from './session'
import { User } from '@/models/User'

export const currentUser = cache(async () => {
  const s = await verify((await cookies()).get(cookieName())?.value)
  if (!s) return null
  await db()
  const u = await User.findById(s.sub).select('name email regNo role active sessionVersion handles').lean()
  return u?.active && u.sessionVersion === s.v ? u : null
})

export async function requireUser() {
  const u = await currentUser()
  if (!u) redirect('/login')
  return u
}

export async function requireAdmin() {
  const u = await requireUser()
  if (u.role !== 'admin') redirect('/dashboard')
  return u
}

export async function startSession(u: { _id: unknown; role: 'student' | 'admin'; sessionVersion: number }) {
  const token = await sign({ sub: String(u._id), role: u.role, v: u.sessionVersion })
  ;(await cookies()).set(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function endSession() {
  ;(await cookies()).delete(cookieName())
}
