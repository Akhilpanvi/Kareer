import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, Star } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { loadStudent, type Student } from '@/lib/data'
import { ago, fmt } from '@/lib/format'
import { PLATFORMS } from '@/lib/platforms'
import { Bars, Difficulty, Heatmap, Trend } from '@/components/charts'
import { StatusLine } from '@/components/overview'
import { Badge, Card, Empty, PageHeader } from '@/components/ui'
import { SyncButton } from '@/components/sync'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const metadata: Metadata = { title: 'Platform Statistics' }

const Kpis = ({ items }: { items: [string, React.ReactNode][] }) => (
  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-4">
    {items.map(([k, v]) => (
      <div key={k} className="bg-white px-4 py-3">
        <dt className="text-xs text-zinc-500">{k}</dt>
        <dd className="mt-0.5 text-lg font-semibold tabular-nums">{v}</dd>
      </div>
    ))}
  </dl>
)

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h3>
    {children}
  </div>
)

const growth = (s?: Student['stats'][string]) => (s?.history ?? []).map(h => ({ label: new Date(h.at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: h.value! }))

function Section({ platform, s, children }: { platform: string; s?: Student['stats'][string]; children: (d: any) => React.ReactNode }) {
  const p = PLATFORMS[platform]
  return (
    <Card
      title={p.label}
      action={s && <div className="flex items-center gap-3"><StatusLine stat={s} /><a href={p.url(s.handle)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">@{s.handle}<ExternalLink className="size-3" /></a></div>}
    >
      {s?.data ? children(s.data) : <Empty>{s ? (s.status === 'pending' ? 'Waiting for first sync.' : 'No data available for this username.') : <>Not connected. <Link href="/profile" prefetch={false} className="text-brand-700 hover:underline">Add your {p.label} username</Link>.</>}</Empty>}
    </Card>
  )
}

export default async function StatsPage() {
  const me = await requireUser()
  const student = await loadStudent(me._id, { refresh: true })
  if (!student) notFound()
  const { stats } = student

  return (
    <>
      <PageHeader title="Platform Statistics" description="Detailed coding profile data, cached and refreshed automatically."><SyncButton /></PageHeader>
      <div className="space-y-5">
        <Section platform="leetcode" s={stats.leetcode}>
          {lc => (
            <div className="space-y-6">
              <Kpis items={[['Solved', fmt(lc.solved.all)], ['Contest rating', fmt(lc.contest?.rating)], ['Contests', fmt(lc.contest?.attended)], ['Global rank', fmt(lc.ranking)]]} />
              <div className="grid gap-6 md:grid-cols-2">
                <Sub title="Difficulty"><Difficulty solved={lc.solved} totals={lc.totals} /></Sub>
                <Sub title="Solved over time"><Trend points={growth(stats.leetcode)} /></Sub>
                <Sub title="Top topics"><Bars items={lc.topics.slice(0, 8).map((t: any) => ({ ...t, hint: `${t.n} · ${t.level}` }))} /></Sub>
                <Sub title="Languages"><Bars items={lc.languages} /></Sub>
              </div>
              {lc.calendar && Object.keys(lc.calendar).length > 0 && <Sub title="Submissions"><Heatmap days={lc.calendar} /></Sub>}
              <div className="grid gap-6 md:grid-cols-2">
                <Sub title="Recently solved">
                  {lc.recent.length ? (
                    <ul className="divide-y divide-zinc-100 text-sm">
                      {lc.recent.map((r: any) => (
                        <li key={r.url + r.at} className="flex justify-between gap-3 py-2">
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-brand-700">{r.title}</a>
                          <span className="shrink-0 text-xs text-zinc-500">{ago(r.at)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <Empty>No recent accepted submissions.</Empty>}
                </Sub>
                <Sub title="Badges">{lc.badges.length ? <div className="flex flex-wrap gap-1.5">{lc.badges.map((b: string) => <Badge key={b}>{b}</Badge>)}</div> : <Empty>No badges yet.</Empty>}</Sub>
              </div>
            </div>
          )}
        </Section>

        <Section platform="github" s={stats.github}>
          {gh => (
            <div className="space-y-6">
              <Kpis items={[['Repositories', fmt(stats.github?.metrics?.ghRepos)], ['Stars', fmt(gh.stars)], ['Contributions (1y)', fmt(gh.contributions)], ['Followers', fmt(gh.followers)]]} />
              {gh.calendar ? <Sub title="Contributions"><Heatmap days={gh.calendar} /></Sub> : null}
              <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                <Sub title="Recently active repositories">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {gh.repos.map((r: any) => (
                      <li key={r.name} className="rounded-lg border border-zinc-200 p-3.5">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:text-brand-700">{r.name}</a>
                        {r.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{r.description}</p>}
                        <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                          {r.language && <span>{r.language}</span>}
                          <span className="flex items-center gap-0.5"><Star className="size-3" />{r.stars}</span>
                          <span>{ago(r.pushedAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Sub>
                <Sub title="Languages (by repository)">{gh.languages.length ? <Bars items={gh.languages} /> : <Empty>No languages detected.</Empty>}</Sub>
              </div>
            </div>
          )}
        </Section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section platform="codechef" s={stats.codechef}>
            {cc => (
              <div className="space-y-6">
                <Kpis items={[['Rating', fmt(cc.rating)], ['Stars', `${cc.stars}★`], ['Highest', fmt(cc.highest)], ['Solved', fmt(cc.solved)]]} />
                <Sub title="Rating history (recent contests)"><Trend points={cc.history.map((h: any) => ({ label: new Date(h.at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), value: h.rating }))} /></Sub>
                <p className="text-xs text-zinc-500">Global rank {fmt(cc.globalRank)} · Country rank {fmt(cc.countryRank)} · {cc.contests} rated contests</p>
              </div>
            )}
          </Section>
          <Section platform="codeforces" s={stats.codeforces}>
            {cf => (
              <div className="space-y-6">
                <Kpis items={[['Rating', fmt(cf.rating)], ['Max rating', fmt(cf.maxRating)], ['Rank', <span key="r" className="text-sm capitalize">{cf.rank}</span>], ['Contests', fmt(cf.contests)]]} />
                <Sub title="Rating history (recent contests)"><Trend points={cf.history.map((h: any) => ({ label: new Date(h.at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), value: h.rating }))} /></Sub>
              </div>
            )}
          </Section>
        </div>
      </div>
    </>
  )
}
