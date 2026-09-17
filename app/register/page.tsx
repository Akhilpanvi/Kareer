import type { Metadata } from 'next'
import { register } from '@/app/actions/auth'
import { AuthCard } from '@/components/auth-card'
import { ActionForm } from '@/components/forms'
import { Field } from '@/components/ui'
import { registrationDomains, registrationEnabled } from '@/lib/mail'

export const metadata: Metadata = { title: 'Create account' }
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  const domain = registrationDomains()[0]
  return (
    <AuthCard title="Create your Kloop account" description="For KL University students. We'll email you a link to verify your university address.">
      {registrationEnabled() ? (
        <ActionForm action={register} submit="Create account" reset>
          <Field label="Full name"><input name="name" required maxLength={120} autoComplete="name" autoFocus className="input" /></Field>
          <Field label="Registration number"><input name="regNo" required maxLength={20} pattern="[A-Za-z0-9\-]{3,20}" className="input" placeholder="2300030001" /></Field>
          <Field label="University email"><input name="email" type="email" required maxLength={120} autoComplete="email" className="input" placeholder={`name@${domain}`} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Branch"><input name="branch" maxLength={40} className="input" placeholder="CSE" /></Field>
            <Field label="Batch"><input name="batch" maxLength={20} className="input" placeholder="2027" /></Field>
          </div>
          <Field label="Password" hint="At least 10 characters."><input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" /></Field>
          <Field label="Confirm password"><input name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" /></Field>
        </ActionForm>
      ) : (
        <p className="text-sm text-zinc-600">Registration is closed. Contact the Placement Cell for an account.</p>
      )}
    </AuthCard>
  )
}
