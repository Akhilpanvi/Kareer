import type { Metadata } from 'next'
import Link from 'next/link'
import { resetEnabled } from '@/lib/mail'
import { EMAIL_DOMAIN, registrationEnabled } from '@/lib/onboarding'
import { LoginForm } from './form'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kl-lockup.png" alt="KL (Deemed to be University)" className="h-14 w-auto self-start" />
        <div className="mx-auto w-full max-w-sm py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to <span className="wordmark">Kloop</span></h1>
          <p className="mt-1.5 text-sm text-zinc-500">{`Sign in with your university email — your registration number, e.g. 2300030001@${EMAIL_DOMAIN}`}</p>
                    {reset && <p role="status" className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password updated. Sign in with your new password.</p>}
          <LoginForm domain={EMAIL_DOMAIN} />
          {registrationEnabled() && <p className="mt-6 text-sm text-zinc-600">First time here? <Link href="/register" prefetch={false} className="font-medium text-brand-700 hover:underline">Set up your account</Link></p>}
          <p className="mt-6 text-xs text-zinc-500">
            {resetEnabled() ? <Link href="/forgot-password" prefetch={false} className="font-medium text-brand-700 hover:underline">Forgot your password?</Link> : 'Forgot your password? Contact Placements to have it reset.'}
          </p>
        </div>
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Koneru Lakshmaiah Education Foundation</p>
      </section>
      <section className="relative hidden overflow-hidden bg-ink-900 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kl-seal.png" alt="" className="absolute -right-32 -bottom-32 w-[36rem] opacity-[0.07] invert" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="text-sm font-medium text-brand-300">Placements</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight">Your technical growth and profile strength, in one place.</h2>
          <ul className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm text-zinc-300">
            {['GitHub activity', 'LeetCode & CodeChef', 'Projects & certifications', 'Profile strength'].map(t => (
              <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand-500" />{t}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
