import 'server-only'
import type { QueryFilter } from 'mongoose'
import type { UserDoc } from '@/models/User'

export const PAGE = 25
export const SORTS = {
  score: { score: -1, name: 1 },
  leetcode: { 'metrics.lcSolved': -1, name: 1 },
  codechef: { 'metrics.ccRating': -1, name: 1 },
  github: { 'metrics.ghRepos': -1, name: 1 },
  name: { name: 1 },
} as const

export type Params = { q?: string; branch?: string; batch?: string; sort?: string; page?: string }

export function filterOf(p: Params) {
  const f: QueryFilter<UserDoc> = { role: 'student' }
  if (p.branch) f.branch = p.branch.slice(0, 40)
  if (p.batch) f.batch = p.batch.slice(0, 20)
  const q = p.q?.trim().slice(0, 60)
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    f.$or = [{ name: rx }, { regNo: rx }, { email: rx }]
  }
  return f
}

export const sortOf = (s?: string) => SORTS[(s as keyof typeof SORTS) in SORTS ? (s as keyof typeof SORTS) : 'score']
