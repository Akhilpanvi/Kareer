import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { assistantEnabled } from '@/lib/assistant'
import { PageHeader } from '@/components/ui'
import { ShortlistForm } from './form'

export const metadata: Metadata = { title: 'Shortlist' }
export const maxDuration = 60

export default async function ShortlistPage() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="AI shortlisting" description="Paste a job description; Kloop ranks students on their Kloop data and exports the list." />
      {assistantEnabled() ? <ShortlistForm /> : <p className="card p-5 text-sm text-zinc-600">Set GEMINI_API_KEY to enable shortlisting.</p>}
    </>
  )
}
