'use client'
import { useActionState, useTransition } from 'react'
import Link from 'next/link'
import { Download, Sparkles } from 'lucide-react'
import { runShortlist, type Result } from '@/app/actions/shortlist'
import { Badge, Card, Field } from '@/components/ui'

const fmt = (v: unknown) => (v == null || v === '' ? '—' : String(v))

export function ShortlistForm() {
  const [state, run, pending] = useActionState<Result | null, FormData>(runShortlist, null)
  const [, start] = useTransition()
  const ok = state && !('error' in state) ? state : null

  return (
    <div className="space-y-5">
      <Card title="Job description">
        <form className="space-y-4" onSubmit={e => (e.preventDefault(), start(() => run(new FormData(e.currentTarget))))}>
          <Field label="Paste the JD" hint="Kloop reads the requirements, then ranks students on your data. The JD is the only thing sent to the AI.">
            <textarea name="jd" rows={7} maxLength={8000} required className="input" placeholder="Role, required skills, eligibility (CGPA, Class X/XII, backlogs), branches, batch…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Min CGPA"><input name="minCgpa" type="number" step="0.1" min={0} max={10} className="input" placeholder="from JD" /></Field>
            <Field label="Min Class X %"><input name="minClass10" type="number" step="1" min={0} max={100} className="input" placeholder="from JD" /></Field>
            <Field label="Min Class XII %"><input name="minClass12" type="number" step="1" min={0} max={100} className="input" placeholder="from JD" /></Field>
            <Field label="Batch"><input name="batch" maxLength={20} className="input" placeholder="from JD" /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={pending}><Sparkles className="size-4" />{pending ? 'Reading JD and ranking…' : 'Shortlist candidates'}</button>
            {state && 'error' in state && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
          </div>
        </form>
      </Card>

      {ok && (
        <Card
          title={`${ok.rows.length} candidate${ok.rows.length === 1 ? '' : 's'}${ok.criteria.role ? ` · ${ok.criteria.role}` : ''}`}
          action={<a href={`/api/admin/shortlist?t=${encodeURIComponent(ok.token)}`} className="btn-outline py-1.5 text-xs"><Download className="size-3.5" />Export CSV</a>}
        >
          <div className="mb-4 space-y-2 text-sm">
            {ok.criteria.notes && <p className="text-zinc-600">{ok.criteria.notes}</p>}
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-zinc-500">Required:</span>
              {ok.criteria.skills.length ? ok.criteria.skills.map(s => <Badge key={s} tone="brand">{s}</Badge>) : <span className="text-zinc-500">any</span>}
              {ok.criteria.niceToHave.map(s => <Badge key={s}>{s} (bonus)</Badge>)}
            </p>
            <p className="text-xs text-zinc-500">
              Eligibility: {[ok.criteria.minCgpa && `CGPA ≥ ${ok.criteria.minCgpa}`, ok.criteria.minClass10 && `X ≥ ${ok.criteria.minClass10}%`, ok.criteria.minClass12 && `XII ≥ ${ok.criteria.minClass12}%`, ok.criteria.maxBacklogs != null && `backlogs ≤ ${ok.criteria.maxBacklogs}`, ok.criteria.branches.join('/'), ok.criteria.batches.join('/')].filter(Boolean).join(' · ') || 'none stated'} — {ok.considered} student{ok.considered === 1 ? '' : 's'} met the hard filters.
            </p>
          </div>

          {ok.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">#</th><th className="px-3 py-2">Fit</th><th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">CGPA · X · XII</th><th className="px-3 py-2">Coding</th><th className="px-3 py-2">Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ok.rows.map((r, i) => (
                    <tr key={r.id} className="align-top hover:bg-zinc-50/70">
                      <td className="px-3 py-2.5 text-zinc-500 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2.5"><span className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${r.fit >= 70 ? 'bg-emerald-50 text-emerald-700' : r.fit >= 45 ? 'bg-amber-50 text-amber-800' : 'bg-zinc-100 text-zinc-600'}`}>{r.fit}</span></td>
                      <td className="px-3 py-2.5">
                        <Link href={`/admin/students/${r.id}`} prefetch={false} className="font-medium hover:text-brand-700">{r.name}</Link>
                        <div className="text-xs text-zinc-500">{[r.regNo, r.branch, r.batch].filter(Boolean).join(' · ')}</div>
                        <div className="mt-1 flex gap-2 text-xs">
                          {r.resume && <a href={r.resume} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">Résumé</a>}
                          {r.slug && <a href={`/profile/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">Portfolio</a>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-zinc-700">{fmt(r.cgpa)} · {fmt(r.class10)} · {fmt(r.class12)}{r.backlogs ? <span className="block text-xs text-amber-700">{r.backlogs} backlog(s)</span> : null}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-600">LC {fmt(r.lcSolved)} · CC {fmt(r.ccRating)} · GH {fmt(r.ghRepos)}<span className="block">{r.projects} projects · {r.certifications} certs</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">{r.matched.map(s => <Badge key={s} tone="green">{s}</Badge>)}</div>
                        {r.gaps.length > 0 && <p className="mt-1 text-xs text-zinc-500">{r.gaps.join(' · ')}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">No student met the eligibility filters. Loosen the cut-offs, or check that students have filled CGPA and Class X/XII.</p>}
        </Card>
      )}
    </div>
  )
}
