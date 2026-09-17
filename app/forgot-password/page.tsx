import type { Metadata } from 'next'
import { requestReset } from '@/app/actions/auth'
import { AuthCard } from '@/components/auth-card'
import { ActionForm } from '@/components/forms'
import { Field } from '@/components/ui'
import { resetEnabled } from '@/lib/mail'

export const metadata: Metadata = { title: 'Forgot password' }
export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" description="Enter your registration number or email. We'll send a reset link to the email address on your account.">
      {resetEnabled() ? (
        <ActionForm action={requestReset} submit="Send reset link">
          <Field label="Registration number or email"><input name="id" required maxLength={120} autoComplete="username" autoFocus className="input" /></Field>
        </ActionForm>
      ) : (
        <p className="text-sm text-zinc-600">Email reset isn&apos;t set up yet. Contact the Placement Cell to reset your password.</p>
      )}
    </AuthCard>
  )
}
