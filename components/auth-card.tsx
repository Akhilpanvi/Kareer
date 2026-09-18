import Link from 'next/link'

const POINTS = ['Your coding stats, synced automatically', 'A portfolio link you can share', 'Seen by the Placement Cell']

/** Shared split-screen shell for sign-in, setup and password screens. */
export function AuthCard({ title, description, children, wide, back = true }: { title: string; description: string; children: React.ReactNode; wide?: boolean; back?: boolean }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kl-lockup.png" alt="KL (Deemed to be University)" className="h-12 w-auto self-start" />
        <div className={`mx-auto w-full py-10 ${wide ? 'max-w-xl' : 'max-w-sm'}`}>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">{description}</p>
          <div className="mt-7">{children}</div>
          {back && <p className="mt-8 text-sm"><Link href="/login" prefetch={false} className="text-zinc-500 hover:text-zinc-900">← Back to sign in</Link></p>}
        </div>
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Koneru Lakshmaiah Education Foundation</p>
      </section>
      <section className="relative hidden overflow-hidden bg-ink-900 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kl-seal.png" alt="" className="absolute -right-28 -bottom-28 w-[32rem] opacity-[0.07] invert" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-amber-500" />
        <div className="relative flex h-full flex-col justify-end gap-8 p-12 text-white">
          <div>
            <p className="wordmark text-3xl">Kloop</p>
            <p className="mt-1 text-sm text-zinc-400">Placement Cell · KL University</p>
          </div>
          <ul className="space-y-3 text-sm text-zinc-300">
            {POINTS.map(t => (
              <li key={t} className="flex items-start gap-2.5"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gradient-to-br from-brand-400 to-amber-400" />{t}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
