'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, X } from 'lucide-react'
import type { Item } from '@/lib/completion'

/** Shown once per sign-in until the profile is complete. */
export function CompletionNudge({ percent, missing }: { percent: number; missing: Item[] }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      if (sessionStorage.getItem('kloop-nudge') !== String(percent)) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [percent])
  if (!open || !missing.length) return null
  const close = () => {
    setOpen(false)
    try {
      sessionStorage.setItem('kloop-nudge', String(percent))
    } catch {}
  }
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="nudge-title">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="nudge-title" className="font-display text-lg font-semibold">Your profile is {percent}% complete</h2>
            <p className="mt-1 text-sm text-zinc-500">A complete profile is what Placements shortlists from. {missing.length} item{missing.length === 1 ? '' : 's'} left.</p>
          </div>
          <button onClick={close} className="btn-ghost -mt-1 px-2" aria-label="Close"><X className="size-4" /></button>
        </div>
        <Ring percent={percent} />
        <ul className="mt-4 space-y-1.5">
          {missing.slice(0, 5).map(i => (
            <li key={i.label}>
              <Link href={i.href} prefetch={false} onClick={close} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:border-brand-200 hover:bg-brand-50/40">
                <span className="text-zinc-800">{i.label}{i.required && <span className="ml-1.5 text-xs text-brand-700">required</span>}</span>
                <ArrowRight className="size-4 shrink-0 text-zinc-400" />
              </Link>
            </li>
          ))}
          {missing.length > 5 && <li className="px-1 pt-1 text-xs text-zinc-500">and {missing.length - 5} more</li>}
        </ul>
        <div className="mt-5 flex gap-2">
          <button onClick={close} className="btn-outline flex-1">Later</button>
          <Link href={missing[0].href} prefetch={false} onClick={close} className="btn-primary flex-1">Complete now</Link>
        </div>
      </div>
    </div>
  )
}

function Ring({ percent }: { percent: number }) {
  return (
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className="h-full rounded-full bg-gradient-to-r from-brand-700 via-brand-500 to-amber-500 transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function CompletionList({ items, percent }: { items: Item[]; percent: number }) {
  const [all, setAll] = useState(false)
  const show = all ? items : items.filter(i => !i.done)
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tabular-nums">{percent}%</p>
        {percent < 100 && <button onClick={() => setAll(a => !a)} className="text-xs font-medium text-brand-700 hover:underline">{all ? 'Show remaining' : 'Show all'}</button>}
      </div>
      <Ring percent={percent} />
      {percent === 100 ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><Check className="size-4" />Your profile is complete. Keep your stats fresh and add new work as you go.</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {show.map(i => (
            <li key={i.label}>
              <Link href={i.href} prefetch={false} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm ${i.done ? 'text-zinc-400' : 'text-zinc-800 hover:bg-zinc-50'}`}>
                <span className="flex items-center gap-2">
                  <span className={`grid size-4 shrink-0 place-items-center rounded-full ${i.done ? 'bg-emerald-500 text-white' : 'border border-zinc-300'}`}>{i.done && <Check className="size-2.5" />}</span>
                  {i.label}
                </span>
                {!i.done && <ArrowRight className="size-3.5 shrink-0 text-zinc-400" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
