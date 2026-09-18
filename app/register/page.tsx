import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth-card'
import { RegisterWizard } from '@/components/onboarding'
import { platformFields, registrationEnabled } from '@/lib/onboarding'

export const metadata: Metadata = { title: 'Set up your account' }
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <AuthCard wide title="Welcome to Kloop" description="Set up your account in under a minute — we already have your details from Placements.">
      {registrationEnabled() ? <RegisterWizard fields={platformFields()} /> : <p className="text-sm text-zinc-600">Account setup is closed. Contact Placements.</p>}
    </AuthCard>
  )
}
