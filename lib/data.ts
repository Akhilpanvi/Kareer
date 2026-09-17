import 'server-only'
import { after } from 'next/server'
import { isValidObjectId } from 'mongoose'
import { db } from './db'
import { refreshUser, TTL } from './platforms'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'

/** Cached profile + platform stats; stale platforms refresh after the response. */
export async function loadStudent(ref: unknown) {
  const id = String(ref)
  if (!isValidObjectId(id)) return null
  await db()
  const [user, stats] = await Promise.all([
    User.findOne({ _id: id, role: 'student' }).select('-passwordHash -failedLogins -lockedUntil -sessionVersion').lean(),
    PlatformStat.find({ user: id }).lean(),
  ])
  if (!user) return null
  if (stats.some(s => +s.checkedAt! < Date.now() - TTL)) after(() => refreshUser(id))
  return { user, stats: Object.fromEntries(stats.map(s => [s.platform, s])) as Record<string, (typeof stats)[number]> }
}

export type Student = NonNullable<Awaited<ReturnType<typeof loadStudent>>>
