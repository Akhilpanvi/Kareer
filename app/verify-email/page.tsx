import type { Metadata } from 'next'
import Link from 'next/link'
import { confirmEmail } from '@/app/actions/auth'
import { AuthCard } from '@/components/auth-card'
import { ActionForm } from '@/components/forms'

export const metadata: Metadata = { title: 'Verify email', referrer: 'no-referrer' }

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <AuthCard title="Verify your email" description="Confirm your university email to activate your Kloop account.">
      {token ? (
        <ActionForm action={confirmEmail} submit="Verify and continue">
          <input type="hidden" name="token" value={token.slice(0, 100)} />
        </ActionForm>
      ) : (
        <p className="text-sm text-zinc-600">This link is incomplete. <Link href="/register" prefetch={false} className="font-medium text-brand-700 hover:underline">Register again</Link> to get a new one.</p>
      )}
    </AuthCard>
  )
}
