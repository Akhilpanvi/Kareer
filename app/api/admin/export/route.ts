import { NextResponse, type NextRequest } from 'next/server'
import { currentUser } from '@/lib/auth'
import { filterOf, sortOf } from '@/lib/admin'
import { User } from '@/models/User'

const COLS = ['regNo', 'name', 'email', 'branch', 'batch', 'campus', 'section', 'cgpa', 'score', 'lcSolved', 'lcRating', 'ccRating', 'cfRating', 'ghRepos', 'ghContributions', 'projects', 'certifications', 'skills', 'github', 'leetcode', 'codechef', 'codeforces']
// Prefix formula-leading cells so spreadsheets don't execute them
const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`

export async function GET(req: NextRequest) {
  const me = await currentUser()
  if (me?.role !== 'admin' || me.mustChangePassword) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const p = Object.fromEntries(req.nextUrl.searchParams)
  const rows = await User.find(filterOf(p)).sort(sortOf(p.sort)).limit(10000)
    .select({ regNo: 1, name: 1, email: 1, branch: 1, batch: 1, campus: 1, section: 1, cgpa: 1, score: 1, metrics: 1, handles: 1, 'projects._id': 1, 'certifications._id': 1, 'skills.name': 1 }).lean()
  const lines = rows.map(u => {
    const flat: Record<string, unknown> = { ...u, ...u.metrics, ...u.handles, projects: u.projects?.length, certifications: u.certifications?.length, skills: u.skills?.map(s => s.name).join('; ') }
    return COLS.map(c => cell(flat[c])).join(',')
  })
  return new NextResponse([COLS.join(','), ...lines].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="kloop-students-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' },
  })
}
