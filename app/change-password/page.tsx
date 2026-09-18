import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { logout, setFirstPassword } from '@/app/actions/auth'
import { AuthCard } from '@/components/auth-card'
import { ActionForm } from '@/components/forms'
import { Field } from '@/components/ui'

export const metadata: Metadata = { title: 'Set your password' }

export default async function ChangePasswordPage() {
  const me = await currentUser()
  if (!me) redirect('/login')
  if (!me.mustChangePassword) redirect(me.role === 'admin' ? '/admin' : '/dashboard')

  return (
    <AuthCard back={false} title="Set your password" description={`Welcome, ${me.name}. You're signed in with a temporary password — choose your own to continue.`}>
      <ActionForm action={setFirstPassword} submit="Set password and continue">
        <Field label="Temporary password"><input name="current" type="password" required maxLength={128} autoComplete="current-password" autoFocus className="input" /></Field>
        <Field label="New password" hint="At least 10 characters."><input name="next" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" /></Field>
        <Field label="Confirm new password"><input name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" /></Field>
      </ActionForm>
      <form action={logout} className="mt-4 border-t border-zinc-100 pt-4">
        <button className="text-sm text-zinc-500 hover:text-zinc-900">Sign out</button>
      </form>
    </AuthCard>
  )
}
