export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-28 rounded-xl bg-zinc-200/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-zinc-200/60" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-64 rounded-xl bg-zinc-200/60 lg:col-span-2" />
        <div className="h-64 rounded-xl bg-zinc-200/60" />
      </div>
    </div>
  )
}
