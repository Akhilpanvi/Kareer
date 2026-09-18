import type { Day } from '@/lib/platforms/types'

/** 53-week activity grid: CSS grid with short level classes (see globals.css); tooltips only on active days. */
export function Heatmap({ days }: { days: Day }) {
  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 364))
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())
  const cells: { date: string; n: number }[] = []
  for (const d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    cells.push({ date: key, n: days[key] ?? 0 })
  }
  const max = Math.max(1, ...cells.map(c => c.n))
  const months = cells.flatMap((c, i) =>
    i % 7 === 0 && +c.date.slice(8) <= 7 && i < cells.length - 7
      ? [{ col: i / 7 + 1, label: new Date(c.date).toLocaleString('en', { month: 'short', timeZone: 'UTC' }) }]
      : [],
  )

  return (
    <div>
      <div className="overflow-x-auto pb-1" dir="rtl">
        <div className="inline-block" dir="ltr">
          <div className="hm-months">
            {months.map(m => <span key={m.col} style={{ gridColumn: m.col }}>{m.label}</span>)}
          </div>
          <div className="hm" role="img" aria-label={`${cells.filter(c => c.n).length} active days in the past year`}>
            {cells.map((c, i) => (c.n ? <i key={i} className={`l${Math.min(4, Math.ceil((c.n / max) * 4))}`} title={`${c.n} on ${c.date}`} /> : <i key={i} />))}
          </div>
        </div>
      </div>
      <div className="hm-legend mt-2 flex items-center gap-1 text-[10px] text-zinc-500">
        Less <i /><i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" /> More
      </div>
    </div>
  )
}

/** Single-series line with endpoint label; points carry hover titles. */
export function Trend({ points, height = 64 }: { points: { label: string; value: number }[]; height?: number }) {
  if (points.length < 2 || points.every(p => p.value === points[0].value))
    return <p className="text-xs text-zinc-500">{points.length ? `Holding at ${points[0].value} — the trend appears as it changes.` : 'Not enough history yet.'}</p>
  const w = 300, pad = 6
  const vals = points.map(p => p.value)
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1
  const xy = points.map((p, i) => [pad + (i / (points.length - 1)) * (w - pad * 2), pad + (1 - (p.value - lo) / span) * (height - pad * 2)] as const)
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={`Trend from ${vals[0]} to ${vals.at(-1)}`}>
        <line x1={0} x2={w} y1={height - 1} y2={height - 1} className="stroke-zinc-200" strokeWidth={1} />
        <polyline points={xy.map(p => p.join(',')).join(' ')} fill="none" className="stroke-brand-600" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {xy.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={10} fill="transparent"><title>{`${points[i].label}: ${points[i].value}`}</title></circle>
            {i === xy.length - 1 && <circle cx={x} cy={y} r={4} className="fill-brand-600 stroke-white" strokeWidth={2} />}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
        <span>{points[0].label}</span>
        <span>low {lo} · high {hi}</span>
        <span>{points.at(-1)!.label}</span>
      </div>
    </div>
  )
}

/** Labelled horizontal bars for magnitude (one hue, value text beside each bar). */
export function Bars({ items, max, tone = 'bg-zinc-800' }: { items: { name: string; n: number; hint?: string }[]; max?: number; tone?: string }) {
  const top = max ?? Math.max(1, ...items.map(i => i.n))
  return (
    <ul className="space-y-2.5">
      {items.map(i => (
        <li key={i.name} className="text-sm">
          <div className="mb-1 flex justify-between gap-2">
            <span className="truncate text-zinc-700">{i.name}</span>
            <span className="shrink-0 tabular-nums text-zinc-500">{i.hint ?? i.n}</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, (i.n / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Easy/Medium/Hard stacked bar with 2px gaps and direct labels. */
export function Difficulty({ solved, totals }: { solved: Record<string, number>; totals?: Record<string, number> }) {
  const parts = [['easy', 'Easy', 'bg-easy'], ['medium', 'Medium', 'bg-medium'], ['hard', 'Hard', 'bg-hard']] as const
  const all = Math.max(1, solved.all ?? 0)
  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-zinc-100">
        {parts.map(([k, label, bg]) => solved[k] ? <div key={k} title={`${label}: ${solved[k]}`} className={`${bg} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(solved[k] / all) * 100}%` }} /> : null)}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {parts.map(([k, label, bg]) => (
          <div key={k}>
            <dt className="flex items-center gap-1.5 text-xs text-zinc-500"><span className={`size-2 rounded-full ${bg}`} />{label}</dt>
            <dd className="font-semibold tabular-nums text-zinc-900">
              {solved[k] ?? 0}
              {totals?.[k] && <span className="font-normal text-zinc-400"> / {totals[k]}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function ScoreRing({ score }: { score: number }) {
  const r = 34, c = 2 * Math.PI * r
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <defs>
          <linearGradient id="kloop-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-700)" />
            <stop offset="60%" stopColor="var(--color-brand-500)" />
            <stop offset="100%" stopColor="#e07a2f" />
          </linearGradient>
        </defs>
        <circle cx={40} cy={40} r={r} fill="none" strokeWidth={7} className="stroke-zinc-100" />
        <circle cx={40} cy={40} r={r} fill="none" strokeWidth={7} strokeLinecap="round" stroke="url(#kloop-ring)" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-2xl font-semibold tabular-nums">{score}</span>
        <span className="mt-1 text-[10px] text-zinc-500">of 100</span>
      </div>
    </div>
  )
}
