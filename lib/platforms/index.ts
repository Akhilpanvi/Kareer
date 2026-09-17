import { Types } from 'mongoose'
import { db } from '../db'
import { readiness } from '../score'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'
import { github } from './github'
import { leetcode } from './leetcode'
import { codechef } from './codechef'
import { codeforces } from './codeforces'
import type { Platform } from './types'

// Add a platform: write a fetcher and register it here.
export const PLATFORMS: Record<string, Platform> = { github, leetcode, codechef, codeforces }
export const PLATFORM_KEYS = Object.keys(PLATFORMS)

export const TTL = 12 * 3600_000
export const COOLDOWN = 10 * 60_000

async function refreshStat(stat: { _id: Types.ObjectId; platform: string; handle: string }) {
  const now = new Date()
  try {
    const r = await PLATFORMS[stat.platform].fetch(stat.handle)
    await PlatformStat.updateOne(
      { _id: stat._id },
      r
        ? {
            $set: { status: 'ok', data: r.data, metrics: r.metrics, fetchedAt: now, checkedAt: now, error: null },
            $push: { history: { $each: [{ at: now, value: r.value }], $slice: -90 } },
          }
        : { $set: { status: 'not_found', data: null, metrics: null, checkedAt: now, error: null } },
    )
  } catch (e) {
    await PlatformStat.updateOne({ _id: stat._id }, { $set: { status: 'error', error: String((e as Error).message).slice(0, 200), checkedAt: now } })
  }
}

/** Make PlatformStat docs mirror the user's handles. */
export async function syncHandles(userId: Types.ObjectId | string, handles: Record<string, string>) {
  await db()
  const user = new Types.ObjectId(String(userId))
  const entries = Object.entries(handles).filter(([p, h]) => PLATFORMS[p] && h)
  await PlatformStat.deleteMany({ user, platform: { $nin: entries.map(([p]) => p) } })
  const existing = await PlatformStat.find({ user }).select('platform handle').lean()
  for (const [platform, handle] of entries) {
    const cur = existing.find(s => s.platform === platform)
    if (cur?.handle === handle) continue
    await PlatformStat.updateOne(
      { user, platform },
      { $set: { handle, status: 'pending', data: null, metrics: null, history: [], checkedAt: new Date(0) } },
      { upsert: true },
    )
  }
}

export async function recompute(userId: Types.ObjectId | string) {
  const [user, stats] = await Promise.all([
    User.findById(userId).select('headline bio links handles skills projects certifications achievements cgpa').lean(),
    PlatformStat.find({ user: userId, status: 'ok' }).select('metrics').lean(),
  ])
  if (!user) return
  const metrics = Object.assign({}, ...stats.map(s => s.metrics))
  await User.updateOne({ _id: userId }, { $set: { metrics, score: readiness(user, metrics) } })
}

/** Refresh stale (or all, if force) stats for a user. */
export async function refreshUser(userId: Types.ObjectId | string, force = false) {
  await db()
  const edge = new Date(Date.now() - (force ? COOLDOWN : TTL))
  const stale = await PlatformStat.find({ user: userId, checkedAt: { $lt: edge } }).select('platform handle').lean()
  if (!stale.length) return 0
  await Promise.all(stale.map(refreshStat))
  await recompute(userId)
  return stale.length
}

/** Cron: refresh the stalest stats across all users within a time budget. */
export async function refreshStalest(budgetMs = 50_000, limit = 200) {
  await db()
  const started = Date.now()
  const stale = await PlatformStat.find({ checkedAt: { $lt: new Date(Date.now() - TTL) } })
    .sort({ checkedAt: 1 }).limit(limit).select('user platform handle').lean()
  const touched = new Set<string>()
  let done = 0
  for (let i = 0; i < stale.length && Date.now() - started < budgetMs; i += 4) {
    const batch = stale.slice(i, i + 4)
    await Promise.all(batch.map(refreshStat))
    batch.forEach(s => touched.add(String(s.user)))
    done += batch.length
  }
  for (const id of touched) await recompute(id)
  return { refreshed: done, users: touched.size, remaining: stale.length - done }
}
