'use client'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'

type Turn = { role: 'user' | 'model'; text: string }

const STARTERS = ['What should I improve first?', 'Plan my DSA practice for this week', 'How can I make my projects stand out?']

export function Assistant() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  const [quota, setQuota] = useState<{ remaining: number; limit: number }>()
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [turns, busy, open])
  useEffect(() => {
    if (open && !quota) fetch('/api/assistant').then(r => r.json()).then(setQuota).catch(() => {})
  }, [open, quota])

  async function send(text: string) {
    const q = text.trim().slice(0, 500)
    if (!q || busy) return
    const next = [...turns, { role: 'user' as const, text: q }]
    setTurns(next); setInput(''); setBusy(true); setNote(undefined)
    try {
      const res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.slice(-7) }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
      setTurns([...next, { role: 'model', text: data.reply }])
      setQuota(q => (q ? { ...q, remaining: data.remaining } : q))
      setNote(undefined)
    } catch (e) {
      setTurns(turns)
      setInput(q)
      setNote((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {open && (
        <section role="dialog" aria-label="Kloop Coach" className="fixed inset-x-3 bottom-20 z-40 flex max-h-[70dvh] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl sm:inset-x-auto sm:right-5 sm:w-96">
          <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Kloop Coach</p>
              <p className="text-xs text-zinc-500">Advice based on your Kloop profile. Can&apos;t change your data.</p>
              {quota && <p className="mt-0.5 text-xs text-zinc-500">{quota.remaining} of {quota.limit} questions left today</p>}
            </div>
            <button onClick={() => setOpen(false)} className="btn-ghost px-2" aria-label="Close"><X className="size-4" /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {!turns.length && (
              <div className="space-y-2">
                <p className="text-zinc-600">Ask about your preparation. Try:</p>
                {STARTERS.map(s => <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50">{s}</button>)}
              </div>
            )}
            {turns.map((t, i) => (
              <p key={i} className={`whitespace-pre-wrap rounded-lg px-3 py-2 ${t.role === 'user' ? 'ml-8 bg-brand-600 text-white' : 'mr-8 bg-zinc-100 text-zinc-800'}`}>{t.text}</p>
            ))}
            {busy && <p className="mr-8 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-500">Thinking…</p>}
            <div ref={end} />
          </div>
          <form onSubmit={e => (e.preventDefault(), send(input))} className="border-t border-zinc-100 p-3">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} maxLength={500} placeholder="Ask Kloop Coach…" className="input" aria-label="Message" />
              <button className="btn-primary px-3" disabled={busy || !input.trim()} aria-label="Send"><Send className="size-4" /></button>
            </div>
            {note && <p className="mt-1.5 text-xs text-zinc-500">{note}</p>}
          </form>
        </section>
      )}
      <button onClick={() => setOpen(o => !o)} className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-brand-700" aria-expanded={open}>
        <MessageCircle className="size-4" />Coach
      </button>
    </>
  )
}
