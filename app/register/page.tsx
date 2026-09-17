import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth-card'
import { RegisterWizard } from '@/components/onboarding'
import { platformFields, registrationEnabled } from '@/lib/onboarding'

export const metadata: Metadata = { title: 'Set up your account' }
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <AuthCard title="Set up your Kloop account" description="Enter the registration number the Placement Cell has on file.">
      {registrationEnabled() ? <RegisterWizard fields={platformFields()} /> : <p className="text-sm text-zinc-600">Account setup is closed. Contact the Placement Cell.</p>}
    </AuthCard>
  )
}
