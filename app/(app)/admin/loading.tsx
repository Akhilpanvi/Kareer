export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded-lg bg-zinc-200/70" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-20 rounded-xl bg-zinc-200/60" />)}
      </div>
      <div className="space-y-px overflow-hidden rounded-xl bg-zinc-200/60 p-px">
        <div className="h-12 bg-zinc-100" />
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-14 bg-white/70" />)}
      </div>
    </div>
  )
}
