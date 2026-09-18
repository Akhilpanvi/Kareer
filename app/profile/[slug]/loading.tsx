export default function Loading() {
  return (
    <main className="min-h-dvh animate-pulse bg-zinc-50" aria-busy="true" aria-label="Loading profile">
      <div className="h-14 border-b border-zinc-200 bg-white" />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <div className="h-44 rounded-xl bg-zinc-200/60" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-zinc-200/60" />)}</div>
        <div className="grid gap-5 lg:grid-cols-3"><div className="h-80 rounded-xl bg-zinc-200/60 lg:col-span-2" /><div className="h-80 rounded-xl bg-zinc-200/60" /></div>
      </div>
    </main>
  )
}
