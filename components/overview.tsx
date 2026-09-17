import Link from 'next/link'
import { Activity, Award, BadgeCheck, Code2, ExternalLink, FileText, Briefcase, FolderGit2, GitBranch, Globe, Sparkles, Star, Target, TrendingUp, Trophy } from 'lucide-react'
import { Bars, Difficulty, Heatmap, ScoreRing } from './charts'
import { Avatar, Badge, Card, Empty, Meter, Stat } from './ui'
import { ago, fmt, monthYear } from '@/lib/format'
import { PLATFORMS } from '@/lib/platforms'
import { breakdown, MAX } from '@/lib/score'
import type { Student } from '@/lib/data'
import type { Day } from '@/lib/platforms/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Feed = { at: Date; text: string; href?: string; icon: typeof Activity }

function feed({ user, stats }: Student): Feed[] {
  const items: Feed[] = []
  const month = Date.now() - 30 * 86400_000
  for (const s of Object.values(stats)) {
    const h = (s.history ?? []).filter(p => +p.at! >= month)
    const delta = h.length > 1 ? h.at(-1)!.value! - h[0].value! : 0
    if (delta > 0) items.push({ at: h.at(-1)!.at!, text: `+${delta} ${PLATFORMS[s.platform].unit} on ${PLATFORMS[s.platform].label} this month`, icon: TrendingUp })
  }
  const lc = stats.leetcode?.data as any, gh = stats.github?.data as any
  lc?.recent?.slice(0, 4).forEach((r: any) => items.push({ at: r.at, text: `Solved “${r.title}” on LeetCode`, href: r.url, icon: Code2 }))
  gh?.repos?.slice(0, 3).forEach((r: any) => items.push({ at: r.pushedAt, text: `Pushed to ${r.name}`, href: r.url, icon: GitBranch }))
  user.projects?.slice(0, 2).forEach(p => items.push({ at: p.createdAt, text: `Added project ${p.title}`, icon: FolderGit2 }))
  user.certifications?.slice(0, 2).forEach(c => items.push({ at: c.createdAt, text: `Earned ${c.name}`, icon: BadgeCheck }))
  return items.filter(i => i.at).sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 7)
}

export function calendar(stats: Student['stats']) {
  const days: Day = {}
  for (const p of ['github', 'leetcode'])
    for (const [d, n] of Object.entries(((stats[p]?.data as any)?.calendar ?? {}) as Day)) days[d] = (days[d] ?? 0) + n
  return days
}

export function StatusLine({ stat }: { stat?: Student['stats'][string] }) {
  if (!stat) return null
  if (stat.status === 'ok') return <span className="text-xs text-zinc-500">Synced {ago(stat.fetchedAt)}</span>
  if (stat.status === 'pending') return <Badge>Sync pending</Badge>
  if (stat.status === 'not_found') return <Badge tone="amber">@{stat.handle} not found</Badge>
  return <Badge tone="red" >Sync failed · retrying</Badge>
}

export function Overview({ student, actions, self }: { student: Student; actions?: React.ReactNode; self?: boolean }) {
  const { user, stats } = student
  const lc = stats.leetcode?.data as any, cc = stats.codechef?.data as any, gh = stats.github?.data as any, cf = stats.codeforces?.data as any
  const parts = breakdown(user, Object.fromEntries(Object.entries(user.metrics ?? {})))
  const days = calendar(stats)
  const activeDays = Object.keys(days).length
  const lastSync = Object.values(stats).map(s => s.fetchedAt).filter(Boolean).sort().at(-1)
  const links = [
    user.links?.linkedin && { href: user.links.linkedin, label: 'LinkedIn', icon: Briefcase },
    user.links?.portfolio && { href: user.links.portfolio, label: 'Portfolio', icon: Globe },
    user.links?.resume && { href: user.links.resume, label: 'Resume', icon: FileText },
    ...Object.entries(user.handles ?? {}).filter(([p]) => PLATFORMS[p]).map(([p, h]) => ({ href: PLATFORMS[p].url(h), label: PLATFORMS[p].label, icon: ExternalLink })),
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[]
  const add = (href: string, text: string) => (self ? <Link href={href} className="text-xs font-medium text-brand-700 hover:underline">{text}</Link> : undefined)

  return (
    <div className="space-y-5">
      <section className="card flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <Avatar name={user.name} src={gh?.avatar ?? lc?.avatar} size="size-16" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{user.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {[user.regNo, user.branch, user.batch && `Batch ${user.batch}`, user.campus, user.cgpa && `CGPA ${user.cgpa}`].filter(Boolean).join(' · ')}
            </p>
            {user.headline ? <p className="mt-2 text-sm text-zinc-700">{user.headline}</p> : self && <Link href="/profile" className="mt-2 inline-block text-sm text-brand-700 hover:underline">Add a headline and links →</Link>}
            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {links.map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900">
                    <l.icon className="size-3.5" />{l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5 border-t border-zinc-100 pt-5 md:max-w-[28rem] md:shrink-0 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          <ScoreRing score={user.score ?? 0} />
          <div className="min-w-0 space-y-2">
            <div>
              <div className="text-sm font-semibold">Placement readiness</div>
              <div className="text-xs text-zinc-500">{lastSync ? `Platforms synced ${ago(lastSync)}` : 'No platform data yet'}</div>
            </div>
            {actions}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="LeetCode solved" icon={Code2} value={fmt(lc?.solved?.all)} hint={lc?.contest ? `Contest rating ${lc.contest.rating}` : lc ? `${lc.solved.hard} hard` : 'Not connected'} />
        <Stat label="CodeChef rating" icon={Trophy} value={fmt(cc?.rating)} hint={cc ? `${cc.stars}★ · highest ${fmt(cc.highest)}` : 'Not connected'} />
        <Stat label="Codeforces rating" icon={Target} value={fmt(cf?.rating)} hint={cf ? cf.rank : 'Not connected'} />
        <Stat label="GitHub repositories" icon={FolderGit2} value={fmt(user.metrics?.ghRepos)} hint={gh ? `${fmt(gh.stars)} stars` : 'Not connected'} />
        <Stat label="Projects" icon={Sparkles} value={user.projects?.length ?? 0} hint={`${user.skills?.length ?? 0} skills listed`} />
        <Stat label="Certifications" icon={Award} value={user.certifications?.length ?? 0} hint={`${user.achievements?.length ?? 0} achievements`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Coding activity" icon={Activity} className="lg:col-span-2" action={<span className="text-xs text-zinc-500">{activeDays} active days · past year</span>}>
          {activeDays ? <Heatmap days={days} /> : <Empty>Connect GitHub or LeetCode to see daily activity.</Empty>}
          <p className="mt-3 text-xs text-zinc-500">GitHub contributions and LeetCode submissions combined{gh && gh.contributions == null ? ' (GitHub calendar requires a server token)' : ''}.</p>
        </Card>
        <Card title="Readiness breakdown" icon={Target}>
          <ul className="space-y-3">
            {(Object.keys(MAX) as (keyof typeof MAX)[]).map(k => (
              <li key={k} className="text-sm">
                <div className="mb-1 flex justify-between"><span className="capitalize text-zinc-700">{k === 'dsa' ? 'Problem solving' : k}</span><span className="tabular-nums text-zinc-500">{Math.round(parts[k])}/{MAX[k]}</span></div>
                <Meter value={parts[k]} max={MAX[k]} label={k} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="LeetCode" icon={Code2} action={<StatusLine stat={stats.leetcode} />}>
          {lc ? (
            <div className="space-y-5">
              <Difficulty solved={lc.solved} totals={lc.totals} />
              {lc.topics?.length > 0 && <Bars items={lc.topics.slice(0, 5)} />}
            </div>
          ) : <Empty>No LeetCode data.</Empty>}
        </Card>
        <Card title="GitHub" icon={GitBranch} action={<StatusLine stat={stats.github} />}>
          {gh?.repos?.length ? (
            <ul className="-my-2 divide-y divide-zinc-100">
              {gh.repos.slice(0, 5).map((r: any) => (
                <li key={r.name} className="py-2.5">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-900 hover:text-brand-700">{r.name}</a>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                    {r.language && <span>{r.language}</span>}
                    <span className="flex items-center gap-0.5"><Star className="size-3" />{r.stars}</span>
                    <span>updated {ago(r.pushedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty>No GitHub repositories.</Empty>}
        </Card>
        <Card title="Recent progress" icon={TrendingUp}>
          {(() => {
            const items = feed(student)
            return items.length ? (
              <ol className="space-y-3">
                {items.map((i, n) => (
                  <li key={n} className="flex gap-3 text-sm">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-zinc-100"><i.icon className="size-3.5 text-zinc-500" /></span>
                    <div className="min-w-0">
                      {i.href ? <a href={i.href} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-zinc-800 hover:text-brand-700">{i.text}</a> : <p className="line-clamp-2 text-zinc-800">{i.text}</p>}
                      <p className="text-xs text-zinc-500">{ago(i.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty>Progress appears here as you code and add achievements.</Empty>
          })()}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Projects" icon={FolderGit2} className="lg:col-span-2" action={add('/achievements#projects', 'Manage')}>
          {user.projects?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {user.projects.slice(0, 4).map(p => (
                <article key={String(p._id)} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{p.title}</h3>
                    {(p.url || p.repo) && <a href={p.url || p.repo!} target="_blank" rel="noopener noreferrer" aria-label="Open project" className="text-zinc-400 hover:text-zinc-700"><ExternalLink className="size-4" /></a>}
                  </div>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{p.description}</p>}
                  {p.tech?.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{p.tech.slice(0, 5).map(t => <Badge key={t}>{t}</Badge>)}</div>}
                </article>
              ))}
            </div>
          ) : <Empty>No projects added yet.</Empty>}
        </Card>
        <div className="space-y-5">
          <Card title="Skills" icon={Sparkles} action={add('/achievements', 'Manage')}>
            {user.skills?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {user.skills.map(s => <Badge key={s.name} tone={s.level === 'advanced' ? 'brand' : 'zinc'}>{s.name}</Badge>)}
              </div>
            ) : <Empty>No skills listed.</Empty>}
          </Card>
          <Card title="Certifications" icon={BadgeCheck} action={add('/achievements#certifications', 'Manage')}>
            {user.certifications?.length ? (
              <ul className="space-y-2.5">
                {user.certifications.slice(0, 4).map(c => (
                  <li key={String(c._id)} className="text-sm">
                    {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand-700">{c.name}</a> : <span className="font-medium">{c.name}</span>}
                    <p className="text-xs text-zinc-500">{[c.issuer, monthYear(c.date)].filter(Boolean).join(' · ')}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>No certifications added.</Empty>}
          </Card>
        </div>
      </div>
    </div>
  )
}
