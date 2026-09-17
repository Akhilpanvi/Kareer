import Link from 'next/link'

export function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kl-lockup.png" alt="KL (Deemed to be University)" className="mx-auto mb-8 h-12 w-auto" />
        <div className="card p-6">
          <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm"><Link href="/login" prefetch={false} className="text-zinc-600 hover:text-zinc-900">← Back to sign in</Link></p>
      </div>
    </main>
  )
}
