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
    <AuthCard title="Forgot your password?" description="Enter your account email and we'll send you a reset link.">
      {resetEnabled() ? (
        <ActionForm action={requestReset} submit="Send reset link">
          <Field label="Email"><input name="id" type="email" required maxLength={120} autoComplete="email" autoFocus className="input" /></Field>
        </ActionForm>
      ) : (
        <p className="text-sm text-zinc-600">Email reset isn&apos;t set up yet. Contact Placements to reset your password.</p>
      )}
    </AuthCard>
  )
}
