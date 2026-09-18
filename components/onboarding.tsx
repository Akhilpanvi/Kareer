'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check as CheckIcon, CheckCircle2, Eye, EyeOff, Loader2, XCircle } from 'lucide-react'
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

const strength = (pw: string) => [pw.length >= 10, pw.length >= 14, /[A-Z]/.test(pw) || /[^a-z0-9]/i.test(pw), /\d/.test(pw)].filter(Boolean).length

function Strength({ value }: { value: string }) {
  const n = value ? strength(value) : 0
  const label = ['Too short', 'Okay', 'Good', 'Strong'][Math.max(0, n - 1)] ?? ''
  return (
    <span className="mt-2 block">
      <span className="flex gap-1">
        {[1, 2, 3, 4].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= n ? (n >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-zinc-200'}`} />)}
      </span>
      {value && <span className="mt-1 block text-xs text-zinc-500">{label}</span>}
    </span>
  )
}

function Steps({ step }: { step: number }) {
  return (
    <ol className="mb-7 flex items-center gap-2">
      {['You', 'Password', 'Profiles'].map((label, i) => {
        const n = i + 1, done = n < step, now = n === step
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-500 text-white' : now ? 'bg-brand-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
              {done ? <CheckIcon className="size-3.5" /> : n}
            </span>
            <span className={`text-sm ${now ? 'font-medium text-zinc-900' : 'text-zinc-500'}`}>{label}</span>
            {n < 3 && <span className={`h-px flex-1 ${done ? 'bg-emerald-400' : 'bg-zinc-200'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

export function RegisterWizard({ fields }: { fields: PlatformField[] }) {
  const [step, setStep] = useState(1)
  const [preview, setPreview] = useState<Preview>()
  const [password, setPassword] = useState({ password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  return (
    <div>
      <Steps step={step} />

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
          {!preview ? (
            <>
              <Field label="Registration number" hint="The number on your ID card.">
                <input name="regNo" required maxLength={20} autoFocus inputMode="numeric" className="input text-lg tracking-wide" placeholder="2400030001" />
              </Field>
              <Alert text={error} />
              <button className="btn-primary w-full py-2.5" disabled={pending}>{pending ? 'Finding you…' : 'Continue'}</button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-brand-50/70 to-white p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-brand-600 text-base font-semibold text-white">{preview.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('')}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{preview.name}</p>
                    <p className="text-sm text-zinc-500">{[preview.regNo, preview.branch, preview.batch && `Batch ${preview.batch}`].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-zinc-500">Sign-in email: <span className="font-medium text-zinc-700">{preview.email}</span></p>
              </div>
              <Alert text={error} />
              <div className="flex gap-2">
                <button type="button" className="btn-outline" onClick={() => (setPreview(undefined), setError(undefined))}>Not me</button>
                <button className="btn-primary flex-1 py-2.5">That&apos;s me — continue</button>
              </div>
            </>
          )}
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
          <Field label="Create a password" hint="At least 10 characters. You will use it with your university email.">
            <span className="relative block">
              <input type={show ? 'text' : 'password'} required minLength={10} maxLength={128} autoComplete="new-password" autoFocus value={password.password} onChange={e => setPassword({ ...password, password: e.target.value })} className="input pr-10" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
            <Strength value={password.password} />
          </Field>
          <Field label="Confirm password"><input type={show ? 'text' : 'password'} required minLength={10} maxLength={128} autoComplete="new-password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} className="input" /></Field>
          <Alert text={error} />
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={() => (setError(undefined), setStep(1))}>Back</button>
            <button className="btn-primary flex-1 py-2.5">Next</button>
          </div>
        </form>
      )}

      {step === 3 && preview && (
        <form
          className="space-y-4"
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
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            Paste your profile links or usernames — we check them instantly. {fields.filter(f => f.required).map(f => f.label).join(', ')} are required.
          </p>
          <ProfileFields fields={fields} ticket={preview.ticket} />
          <Alert text={error} />
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-outline" onClick={() => (setError(undefined), setStep(2))}>Back</button>
            <button className="btn-primary flex-1 py-2.5" disabled={pending}>{pending ? 'Setting up your account…' : 'Create my account'}</button>
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
