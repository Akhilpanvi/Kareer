'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export function LoginForm() {
  const [state, run, pending] = useActionState(login, null)
  return (
    <form action={run} className="mt-8 space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="id" type="email" required maxLength={120} autoComplete="email" autoFocus className="input" placeholder="name@kluniversity.in" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full py-2.5" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
