import 'server-only'
import { askGeminiJson } from './assistant'
import { db } from './db'
import { User } from '@/models/User'

export type Criteria = {
  role: string
  skills: string[]
  niceToHave: string[]
  branches: string[]
  batches: string[]
  minCgpa: number | null
  minClass10: number | null
  minClass12: number | null
  maxBacklogs: number | null
  minLeetCode: number | null
  notes: string
}

export const EMPTY: Criteria = { role: '', skills: [], niceToHave: [], branches: [], batches: [], minCgpa: null, minClass10: null, minClass12: null, maxBacklogs: null, minLeetCode: null, notes: '' }

const SCHEMA = {
  type: 'object',
  properties: {
    role: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    niceToHave: { type: 'array', items: { type: 'string' } },
    branches: { type: 'array', items: { type: 'string' } },
    batches: { type: 'array', items: { type: 'string' } },
    minCgpa: { type: 'number', nullable: true },
    minClass10: { type: 'number', nullable: true },
    minClass12: { type: 'number', nullable: true },
    maxBacklogs: { type: 'number', nullable: true },
    minLeetCode: { type: 'number', nullable: true },
    notes: { type: 'string' },
  },
  required: ['role', 'skills', 'niceToHave', 'branches', 'batches', 'notes'],
}

/** One small Gemini call: job description -> structured criteria. No student data is sent. */
export async function parseJd(jd: string) {
  const parsed = await askGeminiJson<Partial<Criteria>>(
    `Extract hiring criteria from this job description for a university placement drive.
Rules: skills are short canonical technology names ("React", "Node.js", "SQL"); branches use Indian engineering codes (CSE, ECE, EEE, IT, MECH, CIVIL) only when the JD names them; batches are graduation years; percentages are 0-100 and CGPA 0-10; use null when the JD does not say. notes: one sentence on what matters most.

JOB DESCRIPTION:
${jd.slice(0, 6000)}`,
    SCHEMA,
  )
  const clean = (v: unknown, max: number) => (typeof v === 'number' && v > 0 && v <= max ? v : null)
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 40)).slice(0, n) : [])
  return {
    role: String(parsed.role ?? '').slice(0, 120),
    skills: list(parsed.skills, 20),
    niceToHave: list(parsed.niceToHave, 20),
    branches: list(parsed.branches, 10).map(b => b.toUpperCase()),
    batches: list(parsed.batches, 6),
    minCgpa: clean(parsed.minCgpa, 10),
    minClass10: clean(parsed.minClass10, 100),
    minClass12: clean(parsed.minClass12, 100),
    maxBacklogs: typeof parsed.maxBacklogs === 'number' && parsed.maxBacklogs >= 0 ? Math.round(parsed.maxBacklogs) : null,
    minLeetCode: clean(parsed.minLeetCode, 5000),
    notes: String(parsed.notes ?? '').slice(0, 300),
  } satisfies Criteria
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]/g, '')

export type Candidate = Awaited<ReturnType<typeof shortlist>>['rows'][number]

/** Deterministic ranking in the database — every number here is explainable to a recruiter. */
export async function shortlist(c: Criteria, limit = 100) {
  await db()
  const filter: Record<string, unknown> = { role: 'student', active: true }
  if (c.branches.length) filter.branch = { $in: c.branches.map(b => new RegExp(`^${b}`, 'i')) }
  if (c.batches.length) filter.batch = { $in: c.batches }
  if (c.minCgpa) filter.cgpa = { $gte: c.minCgpa }
  if (c.minClass10) filter.class10 = { $gte: c.minClass10 }
  if (c.minClass12) filter.class12 = { $gte: c.minClass12 }
  if (c.maxBacklogs != null) filter.backlogs = { $in: [null, ...Array.from({ length: c.maxBacklogs + 1 }, (_, i) => i)] }

  const people = await User.find(filter)
    .select({ name: 1, regNo: 1, email: 1, phone: 1, branch: 1, batch: 1, campus: 1, cgpa: 1, class10: 1, class12: 1, backlogs: 1, skills: 1, metrics: 1, score: 1, slug: 1, links: 1, handles: 1, 'projects.title': 1, 'projects.tech': 1, 'certifications.name': 1 })
    .limit(4000).lean()

  const want = c.skills.map(norm), nice = c.niceToHave.map(norm)
  const rows = people.map(u => {
    const owned = new Map<string, number>()
    for (const s of u.skills ?? []) if (s.name) owned.set(norm(s.name), (s.rating ?? 3) / 5)
    const evidence = new Set([...(u.projects ?? []).flatMap(p => (p.tech ?? []).map(norm)), ...(u.certifications ?? []).map(c2 => norm(c2.name ?? ''))])

    const hit = (k: string) => (owned.has(k) ? 0.6 + 0.4 * owned.get(k)! : evidence.has(k) ? 0.7 : 0)
    const matched = c.skills.filter((_, i) => hit(want[i]) > 0)
    const missing = c.skills.filter((_, i) => !hit(want[i]))
    const skillScore = want.length ? (want.reduce((a, k) => a + hit(k), 0) / want.length) * 45 : 25
    const bonus = nice.length ? (nice.reduce((a, k) => a + (hit(k) ? 1 : 0), 0) / nice.length) * 5 : 0

    const m = u.metrics ?? {}
    const lc = m.lcSolved ?? 0
    const coding = Math.min(1, lc / 250) * 12 + Math.min(1, (m.ccRating ?? 0) / 1800) * 4 + Math.min(1, (m.ghRepos ?? 0) / 10) * 4
    const academics = Math.min(1, (u.cgpa ?? 0) / 9) * 12 + Math.min(1, ((u.class10 ?? 0) + (u.class12 ?? 0)) / 190) * 6
    const work = Math.min(1, (u.projects?.length ?? 0) / 3) * 8 + Math.min(1, (u.certifications?.length ?? 0) / 3) * 4

    const gaps: string[] = []
    if (c.minLeetCode && lc < c.minLeetCode) gaps.push(`LeetCode ${lc} < ${c.minLeetCode}`)
    if (missing.length) gaps.push(`missing ${missing.join(', ')}`)
    if (!u.cgpa) gaps.push('CGPA not filled')
    if (c.minClass10 && !u.class10) gaps.push('Class X not filled')

    return {
      id: String(u._id), name: u.name, regNo: u.regNo, email: u.email, phone: u.phone ?? '', branch: u.branch ?? '', batch: u.batch ?? '',
      cgpa: u.cgpa ?? null, class10: u.class10 ?? null, class12: u.class12 ?? null, backlogs: u.backlogs ?? null,
      lcSolved: lc, ccRating: m.ccRating ?? null, ghRepos: m.ghRepos ?? null, projects: u.projects?.length ?? 0, certifications: u.certifications?.length ?? 0,
      profileStrength: u.score ?? 0, slug: u.slug ?? '', resume: u.links?.resume ?? '',
      matched, missing, gaps,
      fit: Math.round(Math.min(100, skillScore + bonus + coding + academics + work)),
    }
  })

  rows.sort((a, b) => b.fit - a.fit || b.profileStrength - a.profileStrength)
  return { rows: rows.slice(0, limit), considered: people.length }
}
