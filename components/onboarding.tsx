'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { checkHandle, completeProfile, finishRegistration, lookupRegNo, type Check, type Preview } from '@/app/actions/onboarding'
import { Field } from './ui'

export type PlatformField = { key: string; label: string; required: boolean }

function HandleField({ field, defaultValue = '', ticket }: { field: PlatformField; defaultValue?: string; ticket?: string }) {
  const [state, setState] = useState<Check | 'checking' | null>(null)
  const last = useRef('')
  async function check(value: string) {
    const v = value.trim()
    if (!v || v === last.current) return
    last.current = v
    setState('checking')
    setState(await checkHandle(field.key, v, ticket))
  }
  return (
    <Field label={`${field.label}${field.required ? ' *' : ' (optional)'}`}>
      <input
        name={field.key}
        defaultValue={defaultValue}
        required={field.required}
        maxLength={200}
        placeholder="username"
        autoCapitalize="off"
        spellCheck={false}
        className="input"
        onBlur={e => check(e.currentTarget.value)}
        onChange={() => (last.current = '', setState(null))}
      />
      <span className="mt-1 flex min-h-5 items-center gap-1.5 text-xs" aria-live="polite">
        {state === 'checking' && <><Loader2 className="size-3.5 animate-spin text-zinc-400" />Checking…</>}
        {state && state !== 'checking' && state.found && <><CheckCircle2 className="size-3.5 text-emerald-600" /><span className="text-emerald-700">{state.summary}</span></>}
        {state && state !== 'checking' && !state.found && <><XCircle className="size-3.5 text-red-600" /><span className="text-red-600">{state.error}</span></>}
      </span>
    </Field>
  )
}

function ProfileFields({ fields, handles = {}, resume = '', portfolio = '', ticket }: { fields: PlatformField[]; handles?: Record<string, string>; resume?: string; portfolio?: string; ticket?: string }) {
  return (
    <>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {fields.map(f => <HandleField key={f.key} field={f} defaultValue={handles[f.key]} ticket={ticket} />)}
      </div>
      <Field label="Resume link *" hint="A shareable link, e.g. Google Drive (view access)."><input name="resume" type="url" required maxLength={300} defaultValue={resume} placeholder="https://" className="input" /></Field>
      <Field label="Portfolio link (optional)"><input name="portfolio" type="url" maxLength={300} defaultValue={portfolio} placeholder="https://" className="input" /></Field>
    </>
  )
}

const Alert = ({ text }: { text?: string }) => (text ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{text}</p> : null)

export function RegisterWizard({ fields }: { fields: PlatformField[] }) {
  const [step, setStep] = useState(1)
  const [preview, setPreview] = useState<Preview>()
  const [password, setPassword] = useState({ password: '', confirm: '' })
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const steps = ['Your details', 'Password', 'Profiles']

  return (
    <div className="space-y-5">
      <ol className="flex gap-2 text-xs">
        {steps.map((s, i) => (
          <li key={s} className={`flex-1 border-t-2 pt-2 ${i + 1 <= step ? 'border-brand-600 font-medium text-zinc-900' : 'border-zinc-200 text-zinc-400'}`}>{i + 1}. {s}</li>
        ))}
      </ol>

      {step === 1 && (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            if (preview) return (setError(undefined), setStep(2))
            const reg = String(new FormData(e.currentTarget).get('regNo'))
            setError(undefined)
            start(async () => {
              const r = await lookupRegNo(reg)
              if ('error' in r) setError(r.error)
              else (setError(undefined), setPreview(r))
            })
          }}
        >
          <Field label="Registration number">
            <input name="regNo" required maxLength={20} autoFocus disabled={!!preview} defaultValue={preview?.regNo} className="input" placeholder="2300030001" />
          </Field>
          {preview && (
            <dl className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
              {[['Name', preview.name], ['Registration no.', preview.regNo], ['University email', preview.email], ['Branch', preview.branch], ['Batch', preview.batch]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-zinc-500">{k}</dt><dd className="truncate text-right font-medium">{v || '—'}</dd></div>
              ))}
            </dl>
          )}
          <Alert text={error} />
          <div className="flex gap-2">
            {preview && <button type="button" className="btn-outline" onClick={() => (setPreview(undefined), setError(undefined))}>Not me</button>}
            <button className="btn-primary flex-1" disabled={pending}>{pending ? 'Looking up…' : preview ? 'Next' : 'Continue'}</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            if (password.password.length < 10) return setError('Use at least 10 characters.')
            if (password.password !== password.confirm) return setError('Passwords do not match.')
            setError(undefined)
            setStep(3)
          }}
        >
          <Field label="Password" hint="At least 10 characters."><input type="password" required minLength={10} maxLength={128} autoComplete="new-password" autoFocus value={password.password} onChange={e => setPassword({ ...password, password: e.target.value })} className="input" /></Field>
          <Field label="Confirm password"><input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} className="input" /></Field>
          <Alert text={error} />
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={() => (setError(undefined), setStep(1))}>Back</button>
            <button className="btn-primary flex-1">Next</button>
          </div>
        </form>
      )}

      {step === 3 && preview && (
        <form
          className="space-y-3"
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            fd.set('password', password.password)
            fd.set('confirm', password.confirm)
            setError(undefined)
            start(async () => {
              const r = await finishRegistration(preview.ticket, fd)
              if (r?.error) setError(r.error)
            })
          }}
        >
          <p className="text-sm text-zinc-600">Usernames are checked with each platform. Required: {fields.filter(f => f.required).map(f => f.label).join(', ')}.</p>
          <ProfileFields fields={fields} ticket={preview.ticket} />
          <Alert text={error} />
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-outline" onClick={() => (setError(undefined), setStep(2))}>Back</button>
            <button className="btn-primary flex-1" disabled={pending}>{pending ? 'Verifying and creating account…' : 'Create account'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

export function CompleteProfileModal({ fields, handles, resume, portfolio, gaps }: { fields: PlatformField[]; handles: Record<string, string>; resume?: string; portfolio?: string; gaps: string[] }) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-zinc-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="complete-title">
      <form
        className="card w-full max-w-lg space-y-3 p-6"
        onSubmit={e => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          setError(undefined)
          start(async () => {
            const r = await completeProfile(fd)
            if ('error' in r) setError(r.error)
            else router.refresh()
          })
        }}
      >
        <div>
          <h2 id="complete-title" className="text-lg font-semibold">Complete your profile</h2>
          <p className="mt-1 text-sm text-zinc-500">Add or fix: <span className="font-medium text-zinc-700">{gaps.join(', ')}</span>. Usernames are checked with each platform.</p>
        </div>
        <ProfileFields fields={fields} handles={handles} resume={resume} portfolio={portfolio} />
        <Alert text={error} />
        <button className="btn-primary w-full" disabled={pending}>{pending ? 'Verifying…' : 'Save and continue'}</button>
      </form>
    </div>
  )
}
