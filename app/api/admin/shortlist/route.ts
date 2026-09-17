import { NextResponse, type NextRequest } from 'next/server'
import { currentUser } from '@/lib/auth'
import { unseal } from '@/lib/session'
import { shortlist, type Criteria } from '@/lib/shortlist'

const COLS = ['rank', 'fit', 'name', 'regNo', 'email', 'phone', 'branch', 'batch', 'cgpa', 'class10', 'class12', 'backlogs', 'lcSolved', 'ccRating', 'ghRepos', 'projects', 'certifications', 'profileStrength', 'matchedSkills', 'missingSkills', 'resume', 'profileUrl'] as const
const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`

export async function GET(req: NextRequest) {
  const me = await currentUser()
  if (me?.role !== 'admin' || me.mustChangePassword) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const payload = await unseal<{ c: Criteria }>(req.nextUrl.searchParams.get('t') ?? '')
  if (!payload) return NextResponse.json({ error: 'This shortlist link expired. Run the search again.' }, { status: 400 })

  const { rows } = await shortlist(payload.c, 500)
  const base = req.nextUrl.origin
  const lines = rows.map((r, i) =>
    COLS.map(c =>
      cell(c === 'rank' ? i + 1 : c === 'matchedSkills' ? r.matched.join('; ') : c === 'missingSkills' ? r.missing.join('; ') : c === 'profileUrl' ? (r.slug ? `${base}/profile/${r.slug}` : '') : r[c as keyof typeof r]),
    ).join(','),
  )
  const name = (payload.c.role || 'shortlist').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()
  return new NextResponse([COLS.join(','), ...lines].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="kloop-${name}-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' },
  })
}
