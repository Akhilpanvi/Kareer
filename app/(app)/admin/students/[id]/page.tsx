import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { loadStudent } from '@/lib/data'
import { ago } from '@/lib/format'
import { PLATFORMS } from '@/lib/platforms'
import { updateStudent } from '@/app/actions/admin'
import { ActionForm } from '@/components/forms'
import { Overview } from '@/components/overview'
import { Card, Disclosure, Field } from '@/components/ui'
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

      <div className="mt-5">
        <Card title="Edit student details">
          <Disclosure label="Edit" defaultOpen={false}>
            <ActionForm action={updateStudent.bind(null, String(user._id))} submit="Save changes">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Registration no."><input name="regNo" required maxLength={20} defaultValue={user.regNo} className="input" /></Field>
                <Field label="Name"><input name="name" required maxLength={120} defaultValue={user.name} className="input" /></Field>
                <Field label="Email"><input name="email" type="email" required maxLength={120} defaultValue={user.email} className="input" /></Field>
                <Field label="Branch"><input name="branch" maxLength={40} defaultValue={user.branch ?? ''} className="input" /></Field>
                <Field label="Batch"><input name="batch" maxLength={20} defaultValue={user.batch ?? ''} className="input" /></Field>
                <Field label="Campus"><input name="campus" maxLength={40} defaultValue={user.campus ?? ''} className="input" /></Field>
                <Field label="Section"><input name="section" maxLength={20} defaultValue={user.section ?? ''} className="input" /></Field>
                <Field label="Phone"><input name="phone" maxLength={20} defaultValue={user.phone ?? ''} className="input" /></Field>
                <Field label="CGPA"><input name="cgpa" type="number" step="0.01" min={0} max={10} defaultValue={user.cgpa ?? ''} className="input" /></Field>
              </div>
              <fieldset className="grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <legend className="mb-1 text-sm font-semibold">Coding platforms</legend>
                {Object.entries(PLATFORMS).map(([key, p]) => (
                  <Field key={key} label={p.label}><input name={key} defaultValue={user.handles?.[key] ?? ''} className="input" placeholder="username" autoCapitalize="off" spellCheck={false} /></Field>
                ))}
              </fieldset>
            </ActionForm>
          </Disclosure>
        </Card>
      </div>
    </>
  )
}
