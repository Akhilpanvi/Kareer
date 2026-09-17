import 'server-only'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { isValidObjectId } from 'mongoose'
import { db } from './db'
import { refreshUser, TTL } from './platforms'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'

/**
 * Cached profile + platform stats. With `refresh`, stale platforms sync after the response —
 * only on real navigations, never on router prefetches.
 */
export async function loadStudent(ref: unknown, { refresh = false } = {}) {
  const id = String(ref)
  if (!isValidObjectId(id)) return null
  await db()
  const [user, stats] = await Promise.all([
    User.findOne({ _id: id, role: 'student' }).select('-passwordHash -failedLogins -lockedUntil -sessionVersion').lean(),
    PlatformStat.find({ user: id }).select('-history._id').lean(),
  ])
  if (!user) return null
  if (refresh && stats.some(s => +s.checkedAt! < Date.now() - TTL)) {
    const h = await headers()
    if (!h.has('next-router-prefetch') && !h.has('next-router-segment-prefetch')) after(() => refreshUser(id))
  }
  return { user, stats: Object.fromEntries(stats.map(s => [s.platform, s])) as Record<string, (typeof stats)[number]> }
}

export type Student = NonNullable<Awaited<ReturnType<typeof loadStudent>>>
