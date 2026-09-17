import type { Metadata } from 'next'
import Link from 'next/link'
import { resetWithToken } from '@/app/actions/auth'
import { AuthCard } from '@/components/auth-card'
import { ActionForm } from '@/components/forms'
import { Field } from '@/components/ui'

export const metadata: Metadata = { title: 'Choose a new password', referrer: 'no-referrer' }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <AuthCard title="Choose a new password" description="You'll be signed out of every other device.">
      {token ? (
        <ActionForm action={resetWithToken} submit="Update password">
          <input type="hidden" name="token" value={token.slice(0, 100)} />
          <Field label="New password" hint="At least 10 characters."><input name="next" type="password" required minLength={10} maxLength={128} autoComplete="new-password" autoFocus className="input" /></Field>
          <Field label="Confirm new password"><input name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" /></Field>
        </ActionForm>
      ) : (
        <p className="text-sm text-zinc-600">This link is incomplete. <Link href="/forgot-password" prefetch={false} className="font-medium text-brand-700 hover:underline">Request a new one</Link>.</p>
      )}
    </AuthCard>
  )
}
