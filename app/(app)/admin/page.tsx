import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Search } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { filterOf, PAGE, sortOf, type Params } from '@/lib/admin'
import { fmt } from '@/lib/format'
import { Avatar, Badge, Meter, PageHeader, Stat } from '@/components/ui'
import { User } from '@/models/User'

export const metadata: Metadata = { title: 'Placement Cell' }

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const filter = filterOf(params)
  await db()

  const [rows, total, [summary], branches, batches] = await Promise.all([
    User.find(filter).sort(sortOf(params.sort)).skip((page - 1) * PAGE).limit(PAGE)
      .select({ name: 1, regNo: 1, branch: 1, batch: 1, score: 1, metrics: 1, active: 1, 'projects._id': 1, 'certifications._id': 1 }).lean(),
    User.countDocuments(filter),
    User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$score' }, ready: { $sum: { $cond: [{ $gte: ['$score', 60] }, 1, 0] } }, connected: { $sum: { $cond: [{ $gt: ['$metrics.lcSolved', null] }, 1, 0] } } } },
    ]),
    User.distinct('branch', { role: 'student' }),
    User.distinct('batch', { role: 'student' }),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const qs = (patch: Params) => '?' + new URLSearchParams(Object.entries({ ...params, ...patch }).filter(([, v]) => v) as [string, string][]).toString()

  return (
    <>
      <PageHeader title="Students" description="Placement readiness across the cohort.">
        <a href={`/api/admin/export${qs({ page: '' })}`} className="btn-outline"><Download className="size-4" />Export CSV</a>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Students" value={fmt(summary?.n ?? 0)} />
        <Stat label="Average readiness" value={Math.round(summary?.avg ?? 0)} hint="out of 100" />
        <Stat label="Placement ready" value={fmt(summary?.ready ?? 0)} hint="readiness ≥ 60" />
        <Stat label="LeetCode connected" value={fmt(summary?.connected ?? 0)} hint={summary?.n ? `${Math.round((summary.connected / summary.n) * 100)}% of students` : undefined} />
      </div>

      <section className="card overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
          <label className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="q" defaultValue={params.q} placeholder="Search name, reg. no, email" className="input pl-9" aria-label="Search" />
          </label>
          <select name="branch" defaultValue={params.branch ?? ''} className="input w-auto" aria-label="Branch">
            <option value="">All branches</option>
            {branches.filter(Boolean).sort().map(b => <option key={b}>{b}</option>)}
          </select>
          <select name="batch" defaultValue={params.batch ?? ''} className="input w-auto" aria-label="Batch">
            <option value="">All batches</option>
            {batches.filter(Boolean).sort().map(b => <option key={b}>{b}</option>)}
          </select>
          <select name="sort" defaultValue={params.sort ?? 'score'} className="input w-auto" aria-label="Sort by">
            <option value="score">Sort: Readiness</option>
            <option value="leetcode">Sort: LeetCode</option>
            <option value="codechef">Sort: CodeChef</option>
            <option value="github">Sort: GitHub</option>
            <option value="name">Sort: Name</option>
          </select>
          <button className="btn-primary">Apply</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Student</th>
                <th className="px-4 py-2.5">Branch · Batch</th>
                <th className="w-40 px-4 py-2.5">Readiness</th>
                <th className="px-4 py-2.5 text-right">LeetCode</th>
                <th className="px-4 py-2.5 text-right">CodeChef</th>
                <th className="px-4 py-2.5 text-right">GitHub</th>
                <th className="px-4 py-2.5 text-right">Projects</th>
                <th className="px-4 py-2.5 text-right">Certs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(s => (
                <tr key={String(s._id)} className="hover:bg-zinc-50/70">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/students/${s._id}`} className="flex items-center gap-3">
                      <Avatar name={s.name} size="size-8" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-900 hover:text-brand-700">{s.name}</span>
                        <span className="block text-xs text-zinc-500">{s.regNo}{!s.active && <> · <Badge tone="red">Disabled</Badge></>}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{[s.branch, s.batch].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2"><Meter value={s.score ?? 0} label="Readiness" /><span className="w-7 text-right tabular-nums">{s.score ?? 0}</span></div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(s.metrics?.lcSolved)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(s.metrics?.ccRating)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(s.metrics?.ghRepos)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.projects?.length ?? 0}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.certifications?.length ?? 0}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">No students match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm text-zinc-500">
          <span>{total ? `${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, total)} of ${fmt(total)}` : '0 results'}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="btn-outline py-1.5">Previous</Link> : <span className="btn-outline pointer-events-none py-1.5 opacity-50">Previous</span>}
            {page < pages ? <Link href={qs({ page: String(page + 1) })} className="btn-outline py-1.5">Next</Link> : <span className="btn-outline pointer-events-none py-1.5 opacity-50">Next</span>}
          </div>
        </footer>
      </section>
    </>
  )
}
