import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { loadStudent } from '@/lib/data'
import { Overview } from '@/components/overview'
import { SyncButton } from '@/components/sync'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function Dashboard() {
  const me = await requireUser()
  const student = await loadStudent(me._id, { refresh: true })
  if (!student) notFound()
  return <Overview student={student} self actions={<SyncButton />} />
}
