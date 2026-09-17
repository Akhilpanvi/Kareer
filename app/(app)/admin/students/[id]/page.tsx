import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { loadStudent } from '@/lib/data'
import { ago } from '@/lib/format'
import { Overview } from '@/components/overview'
import { StudentAdmin } from './actions'

export const metadata: Metadata = { title: 'Student' }

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const student = await loadStudent(id)
  if (!student) notFound()
  const { user } = student

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="btn-ghost -ml-3"><ArrowLeft className="size-4" />All students</Link>
        <span className="text-xs text-zinc-500">{user.email} · {user.phone || 'no phone'} · last login {ago(user.lastLoginAt)}</span>
      </div>
      <Overview student={student} actions={<StudentAdmin id={String(user._id)} active={user.active ?? true} />} />
    </>
  )
}
