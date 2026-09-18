import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BarChart3, GitBranch, Share2, Sparkles, Target, Trophy } from 'lucide-react'
import { registrationEnabled } from '@/lib/onboarding'

export const metadata: Metadata = {
  title: { absolute: 'Kloop · KL University Placements' },
  description: 'Kloop keeps every KL University student’s coding profile, projects and placement readiness in one place — and gives them a portfolio link to share.',
  robots: { index: true, follow: true },
}

const FEATURES = [
  { icon: GitBranch, title: 'Your coding, synced', text: 'GitHub, LeetCode, CodeChef and Codeforces refresh on their own. No screenshots, no spreadsheets.' },
  { icon: Target, title: 'Profile strength', text: 'One score out of 100 showing exactly what to fix next — problem solving, projects, credentials, skills.' },
  { icon: Share2, title: 'A portfolio link', text: 'kloop.klef.me/profile/Your_Name — skills, projects and stats in one page you can send to recruiters.' },
  { icon: Sparkles, title: 'Kloop Coach', text: 'An AI coach that reads your own profile and tells you what to practise this week.' },
  { icon: Trophy, title: 'Achievements that count', text: 'Certifications, hackathons and projects, kept where Placements can see them.' },
  { icon: BarChart3, title: 'Placements view', text: 'Shortlisting against a job description, cohort statistics and exports for drives.' },
]

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/kl-seal.png" alt="KL University" className="size-9" />
            <span className="leading-tight">
              <span className="wordmark block text-lg">Kloop</span>
              <span className="block text-[11px] text-zinc-500">Placements · KL University</span>
            </span>
          </span>
          <nav className="flex items-center gap-2">
            {registrationEnabled() && <Link href="/register" prefetch={false} className="btn-ghost hidden sm:inline-flex">Set up account</Link>}
            <Link href="/login" prefetch={false} className="btn-primary">Sign in</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-zinc-200 bg-ink-900 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kl-seal.png" alt="" className="pointer-events-none absolute -right-24 -bottom-32 w-[34rem] opacity-[0.06] invert" />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-amber-500" />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <p className="text-sm font-medium text-brand-300">For every KL University student</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Everything you build,<br />in one <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-amber-300 bg-clip-text text-transparent">loop</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
              Kloop pulls your GitHub, LeetCode and CodeChef into one profile, scores how placement-ready you are, and gives you a link worth sharing.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {registrationEnabled() && (
                <Link href="/register" prefetch={false} className="btn inline-flex bg-white px-5 py-3 text-base font-semibold text-ink-900 hover:bg-zinc-100">
                  Set up your account<ArrowRight className="size-4" />
                </Link>
              )}
              <Link href="/login" prefetch={false} className="btn border border-white/25 px-5 py-3 text-base font-medium text-white hover:bg-white/10">I already have an account</Link>
            </div>
            <p className="mt-6 text-sm text-zinc-400">Takes under a minute — Placements already has your details.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">What you get</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <li key={f.title} className="card p-5">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><f.icon className="size-4.5" /></span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-zinc-200 bg-zinc-50">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Ready when you are</h2>
              <p className="mt-1.5 text-sm text-zinc-600">Enter your registration number, pick a password, connect your profiles. That&apos;s it.</p>
            </div>
            <Link href={registrationEnabled() ? '/register' : '/login'} prefetch={false} className="btn-primary px-5 py-3 text-base">
              {registrationEnabled() ? 'Get started' : 'Sign in'}<ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-500 sm:px-6">
          <span>© {new Date().getFullYear()} Koneru Lakshmaiah Education Foundation</span>
          <span className="flex gap-4">
            <Link href="/login" prefetch={false} className="hover:text-zinc-900">Sign in</Link>
            {registrationEnabled() && <Link href="/register" prefetch={false} className="hover:text-zinc-900">Set up account</Link>}
          </span>
        </div>
      </footer>
    </div>
  )
}
