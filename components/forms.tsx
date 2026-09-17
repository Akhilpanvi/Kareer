'use client'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { Check, Copy } from 'lucide-react'
import type { State } from '@/lib/form'

export function Notice({ state }: { state: State }) {
  if (!state?.ok && !state?.error) return null
  return (
    <p role="status" className={`text-sm ${state.error ? 'text-red-600' : 'text-emerald-700'}`}>
      {state.error ?? state.ok}
    </p>
  )
}

/** Keeps field values on error (React resets forms after `action=`), resets on success when asked. */
export function ActionForm({ action, submit = 'Save', reset, className = 'space-y-4', children }: {
  action: (s: State, fd: FormData) => Promise<State>
  submit?: string
  reset?: boolean
  className?: string
  children: React.ReactNode
}) {
  const [state, run, pending] = useActionState(action, null)
  const [, start] = useTransition()
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset()
  }, [state, reset])
  return (
    <form ref={ref} className={className} onSubmit={e => (e.preventDefault(), start(() => run(new FormData(e.currentTarget))))}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : submit}</button>
        <Notice state={state} />
      </div>
    </form>
  )
}

/** A single button bound to an argument-less action. */
export function ActionButton({ action, children, className = 'btn-outline', confirm: ask }: {
  action: () => Promise<State | void>
  children: React.ReactNode
  className?: string
  confirm?: string
}) {
  const [state, run, pending] = useActionState(async () => (await action()) ?? null, null)
  const [, start] = useTransition()
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" className={className} disabled={pending} onClick={() => (!ask || window.confirm(ask)) && start(run)}>
        {children}
      </button>
      <Notice state={state} />
      {state?.secret && <Secret value={state.secret} />}
    </div>
  )
}

function Secret({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true))}
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm"
    >
      {value}
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-zinc-400" />}
    </button>
  )
}
