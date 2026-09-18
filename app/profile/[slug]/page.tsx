import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, ExternalLink, FileText, FolderGit2, Globe, Briefcase, Star, Trophy } from 'lucide-react'
import { db } from '@/lib/db'
import { ago, fmt, monthYear } from '@/lib/format'
import { PLATFORMS } from '@/lib/platforms'
import { Badge, Card, Empty, Rating } from '@/components/ui'
import { Difficulty, Heatmap } from '@/components/charts'
import { calendar } from '@/components/overview'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const revalidate = 300

async function load(slug: string) {
  await db()
  const user = await User.findOne({ slug: decodeURIComponent(slug).slice(0, 80), role: 'student', active: true, publicProfile: { $ne: false } })
    .select('name slug headline bio branch batch campus cgpa links handles skills projects certifications achievements score metrics').lean()
  if (!user) return null
  const stats = await PlatformStat.find({ user: user._id, status: 'ok' }).lean()
  return { user, stats: Object.fromEntries(stats.map(s => [s.platform, s])) as Record<string, (typeof stats)[number]> }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug)
  if (!data) return { title: 'Profile not found' }
  const { user } = data
  return {
    title: { absolute: `${user.name} · Kloop` },
    description: user.headline || `${user.name} — ${[user.branch, user.batch && `batch ${user.batch}`].filter(Boolean).join(', ')} at KL University.`,
    robots: { index: true, follow: true },
    openGraph: { title: `${user.name} · Kloop`, description: user.headline ?? undefined, type: 'profile' },
  }
}

export default async function PublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug)
  if (!data) notFound()
  const { user, stats } = data
  const lc = stats.leetcode?.data as any, gh = stats.github?.data as any, cc = stats.codechef?.data as any, cf = stats.codeforces?.data as any
  const days = calendar(stats)
  const links = [
    user.links?.linkedin && { href: user.links.linkedin, label: 'LinkedIn', icon: Briefcase },
    user.links?.portfolio && { href: user.links.portfolio, label: 'Portfolio', icon: Globe },
    user.links?.resume && { href: user.links.resume, label: 'Résumé', icon: FileText },
    ...Object.entries(user.handles ?? {}).filter(([p]) => PLATFORMS[p]).map(([p, h]) => ({ href: PLATFORMS[p].url(h), label: PLATFORMS[p].label, icon: ExternalLink })),
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[]
  const figures = [
    lc && ['LeetCode solved', fmt(lc.solved?.all), lc.contest?.rating ? `contest ${lc.contest.rating}` : undefined],
    cc && ['CodeChef rating', fmt(cc.rating), `${cc.stars ?? 0}★`],
    cf && ['Codeforces rating', fmt(cf.rating), cf.rank],
    gh && ['Public repositories', fmt(user.metrics?.ghRepos), gh.contributions ? `${fmt(gh.contributions)} contributions` : undefined],
  ].filter(Boolean) as [string, string, string | undefined][]

  return (
    <main className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kl-lockup.png" alt="KL (Deemed to be University)" className="h-8 w-auto" />
          <span className="text-xs text-zinc-500"><span className="wordmark text-sm">Kloop</span> · Placements</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <section className="card p-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h1>
          {user.headline && <p className="mt-1.5 text-zinc-700">{user.headline}</p>}
          <p className="mt-2 text-sm text-zinc-500">{[user.branch, user.batch && `Batch ${user.batch}`, user.campus, user.cgpa && `CGPA ${user.cgpa}`].filter(Boolean).join(' · ')}</p>
          {user.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-700">{user.bio}</p>}
          {links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {links.map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer me" className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50">
                  <l.icon className="size-3.5" />{l.label}
                </a>
              ))}
            </div>
          )}
        </section>

        {figures.length > 0 && (
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {figures.map(([label, value, hint]) => (
              <div key={label} className="card p-4">
                <dt className="text-xs font-medium text-zinc-500">{label}</dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</dd>
                {hint && <dd className="truncate text-xs text-zinc-500">{hint}</dd>}
              </div>
            ))}
          </dl>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="min-w-0 space-y-5 lg:col-span-2">
            <Card title="Projects" icon={FolderGit2}>
              {user.projects?.length ? (
                <ul className="space-y-4">
                  {user.projects.map(p => (
                    <li key={String(p._id)} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{p.title}</h3>
                        {(p.url || p.repo) && <a href={p.url || p.repo!} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700" aria-label={`Open ${p.title}`}><ExternalLink className="size-4" /></a>}
                      </div>
                      {p.date && <p className="text-xs text-zinc-500">{monthYear(p.date)}</p>}
                      {p.description && <p className="mt-1.5 text-sm text-zinc-700">{p.description}</p>}
                      {p.tech?.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1">{p.tech.map(t => <Badge key={t}>{t}</Badge>)}</div>}
                    </li>
                  ))}
                </ul>
              ) : <Empty>No projects published yet.</Empty>}
            </Card>

            {Object.keys(days).length > 0 && (
              <Card title="Coding activity">
                <Heatmap days={days} />
                <p className="mt-3 text-xs text-zinc-500">GitHub contributions and LeetCode submissions over the past year.</p>
              </Card>
            )}

            {lc && (
              <Card title="LeetCode">
                <Difficulty solved={lc.solved ?? {}} totals={lc.totals} />
                {lc.topics?.length ? <div className="mt-4 flex flex-wrap gap-1.5">{lc.topics.slice(0, 10).map((t: any) => <Badge key={t.name}>{t.name} · {t.n}</Badge>)}</div> : null}
              </Card>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            <Card title="Skills">
              {user.skills?.length ? (
                <ul className="flex flex-wrap gap-2">
                  {[...user.skills].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map(s => (
                    <li key={s.name} className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1 text-sm">{s.name}<Rating value={s.rating ?? 3} label={s.name ?? undefined} /></li>
                  ))}
                </ul>
              ) : <Empty>No skills listed.</Empty>}
            </Card>

            <Card title="Certifications" icon={BadgeCheck}>
              {user.certifications?.length ? (
                <ul className="space-y-3">
                  {user.certifications.map(c => (
                    <li key={String(c._id)} className="text-sm">
                      {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand-700">{c.name}</a> : <span className="font-medium">{c.name}</span>}
                      <p className="text-xs text-zinc-500">{[c.issuer, monthYear(c.date)].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              ) : <Empty>No certifications listed.</Empty>}
            </Card>

            <Card title="Achievements" icon={Trophy}>
              {user.achievements?.length ? (
                <ul className="space-y-3">
                  {user.achievements.map(a => (
                    <li key={String(a._id)} className="text-sm">
                      <p className="font-medium">{a.title}</p>
                      {a.description && <p className="text-zinc-600">{a.description}</p>}
                      <p className="text-xs text-zinc-500">{monthYear(a.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : <Empty>No achievements listed.</Empty>}
            </Card>

            {gh?.repos?.length > 0 && (
              <Card title="Recent repositories">
                <ul className="space-y-2.5">
                  {gh.repos.slice(0, 5).map((r: any) => (
                    <li key={r.name} className="text-sm">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand-700">{r.name}</a>
                      <p className="flex gap-3 text-xs text-zinc-500">{r.language && <span>{r.language}</span>}<span className="flex items-center gap-0.5"><Star className="size-3" />{r.stars ?? 0}</span><span>{ago(r.pushedAt)}</span></p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>

        <p className="pb-4 text-center text-xs text-zinc-400">
          Published from <Link href="/login" className="hover:text-zinc-600">Kloop</Link> · KL University Placements
        </p>
      </div>
    </main>
  )
}
