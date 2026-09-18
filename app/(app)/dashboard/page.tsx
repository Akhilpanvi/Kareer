import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { loadStudent } from '@/lib/data'
import { Overview } from '@/components/overview'
import { CompletionList } from '@/components/completion'
import { Card } from '@/components/ui'
import { completion } from '@/lib/completion'
import { SyncButton } from '@/components/sync'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function Dashboard() {
  const me = await requireUser()
  const student = await loadStudent(me._id, { refresh: true })
  if (!student) notFound()
  const progress = completion(student.user, Object.values(student.stats))
  return (
    <div className="space-y-5">
      {progress.percent < 100 && (
        <Card title="Profile completion" action={<span className="text-xs text-zinc-500">{progress.done} of {progress.total} done</span>}>
          <CompletionList items={progress.items} percent={progress.percent} />
        </Card>
      )}
      <Overview student={student} self actions={<SyncButton />} />
    </div>
  )
}
