import { Types } from 'mongoose'
import { db } from '../db'
import { profileStrength } from '../score'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'
import { github } from './github'
import { leetcode } from './leetcode'
import { codechef } from './codechef'
import { codeforces } from './codeforces'
import type { Fetched, Platform } from './types'

// Add a platform: write a fetcher and register it here.
export const PLATFORMS: Record<string, Platform> = { github, leetcode, codechef, codeforces }
export const PLATFORM_KEYS = Object.keys(PLATFORMS)

export const TTL = 12 * 3600_000
export const COOLDOWN = 10 * 60_000

const saved = (r: Fetched, now: Date) => ({
  $set: { status: 'ok', data: r.data, metrics: r.metrics, fetchedAt: now, checkedAt: now, error: null },
  $push: { history: { $each: [{ at: now, value: r.value }], $slice: -90 } },
})

/** Fetch a username once and store the result as that user's platform record. Throws if the platform can't be reached. */
export async function verifyAndStore(user: Types.ObjectId | string, platform: string, handle: string) {
  await db()
  const r = await PLATFORMS[platform].fetch(handle)
  const now = new Date()
  const ok = r && saved(r, now)
  await PlatformStat.updateOne(
    { user, platform },
    ok ? { $set: { ...ok.$set, handle }, $push: ok.$push } : { $set: { handle, status: 'not_found', data: null, metrics: null, history: [], checkedAt: now, error: null } },
    { upsert: true },
  )
  return r
}

async function refreshStat(stat: { _id: Types.ObjectId; platform: string; handle: string }) {
  const now = new Date()
  try {
    const r = await PLATFORMS[stat.platform].fetch(stat.handle)
    await PlatformStat.updateOne(
      { _id: stat._id },
      r
        ? saved(r, now)
        : { $set: { status: 'not_found', data: null, metrics: null, checkedAt: now, error: null } },
    )
  } catch (e) {
    await PlatformStat.updateOne({ _id: stat._id }, { $set: { status: 'error', error: String((e as Error).message).slice(0, 200), checkedAt: now } })
  }
}

/** Make PlatformStat docs mirror each user's handles: one read and one bulk write for any number of users. */
export async function syncAllHandles(items: { user: Types.ObjectId | string; handles: Record<string, string> }[]) {
  if (!items.length) return
  await db()
  const users = items.map(i => new Types.ObjectId(String(i.user)))
  const existing = await PlatformStat.find({ user: { $in: users } }).select('user platform handle').lean()
  const byUser = new Map<string, typeof existing>()
  for (const s of existing) byUser.set(String(s.user), [...(byUser.get(String(s.user)) ?? []), s])
  const ops: Parameters<typeof PlatformStat.bulkWrite>[0] = []
  items.forEach((item, i) => {
    const user = users[i]
    const entries = Object.entries(item.handles ?? {}).filter(([p, h]) => PLATFORMS[p] && h)
    const mine = byUser.get(String(user)) ?? []
    if (mine.some(s => !entries.some(([p]) => p === s.platform)))
      ops.push({ deleteMany: { filter: { user, platform: { $nin: entries.map(([p]) => p) } } } })
    for (const [platform, handle] of entries)
      if (mine.find(s => s.platform === platform)?.handle !== handle)
        ops.push({ updateOne: { filter: { user, platform }, update: { $set: { handle, status: 'pending', data: null, metrics: null, history: [], checkedAt: new Date(0) } }, upsert: true } })
  })
  if (ops.length) await PlatformStat.bulkWrite(ops, { ordered: false })
}

export const syncHandles = (user: Types.ObjectId | string, handles: Record<string, string>) => syncAllHandles([{ user, handles }])

export async function recompute(userId: Types.ObjectId | string) {
  const [user, stats] = await Promise.all([
    User.findById(userId).select('headline bio links handles skills projects certifications achievements cgpa').lean(),
    PlatformStat.find({ user: userId, status: 'ok' }).select('metrics').lean(),
  ])
  if (!user) return
  const metrics = Object.assign({}, ...stats.map(s => s.metrics))
  await User.updateOne({ _id: userId }, { $set: { metrics, score: profileStrength(user, metrics) } })
}

type Claimable = { _id: Types.ObjectId; user?: Types.ObjectId; platform: string; handle: string }

/** Atomically mark stats as being checked so concurrent triggers (visits, sync clicks, cron) never fetch twice. */
async function claim<T extends Claimable>(stats: T[], edge: Date) {
  const now = new Date()
  const won = await Promise.all(stats.map(s => PlatformStat.updateOne({ _id: s._id, checkedAt: { $lt: edge } }, { $set: { checkedAt: now } })))
  return stats.filter((_, i) => won[i].modifiedCount)
}

/** Refresh stale (or all, if force) stats for a user. */
export async function refreshUser(userId: Types.ObjectId | string, force = false) {
  await db()
  const edge = new Date(Date.now() - (force ? COOLDOWN : TTL))
  const stale = await PlatformStat.find({ user: userId, checkedAt: { $lt: edge } }).select('platform handle').lean()
  const mine = await claim(stale, edge)
  if (!mine.length) return 0
  await Promise.all(mine.map(refreshStat))
  await recompute(userId)
  return mine.length
}

/** Cron: refresh the stalest stats across all users within a time budget. */
export async function refreshStalest(budgetMs = 50_000, limit = 200) {
  await db()
  const started = Date.now()
  const edge = new Date(Date.now() - TTL)
  const stale = await PlatformStat.find({ checkedAt: { $lt: edge } })
    .sort({ checkedAt: 1 }).limit(limit).select('user platform handle').lean()
  const touched = new Set<string>()
  let done = 0
  for (let i = 0; i < stale.length && Date.now() - started < budgetMs; i += 4) {
    const batch = await claim(stale.slice(i, i + 4), edge)
    await Promise.all(batch.map(refreshStat))
    batch.forEach(s => touched.add(String(s.user)))
    done += batch.length
  }
  for (const id of touched) await recompute(id)
  return { refreshed: done, users: touched.size, remaining: stale.length - done }
}
