import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { ago } from '@/lib/format'
import { createAdmin } from '@/app/actions/admin'
import { ActionForm } from '@/components/forms'
import { Avatar, Badge, Card, Disclosure, Field, PageHeader } from '@/components/ui'
import { User } from '@/models/User'
import { AdminRow } from './actions'

export const metadata: Metadata = { title: 'Placements Team' }

export default async function TeamPage() {
  const me = await requireAdmin()
  await db()
  const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 }).select('name email active lastLoginAt').lean()

  return (
    <>
      <PageHeader title="Placements Team" description="Admin accounts that can manage students and profile data." />

      <Card title="Add an admin" className="mb-5">
        <Disclosure label="Add admin">
          <ActionForm action={createAdmin} submit="Create account" reset className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input name="name" maxLength={120} className="input" placeholder="Placements" /></Field>
            <Field label="Email"><input name="email" type="email" required maxLength={120} className="input" /></Field>
          </ActionForm>
        </Disclosure>
      </Card>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Admin</th>
                <th className="px-4 py-2.5">Last login</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {admins.map(a => (
                <tr key={String(a._id)}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} size="size-8" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-900">{a.name}{String(a._id) === String(me._id) && <span className="ml-1.5 text-xs font-normal text-zinc-400">(you)</span>}</span>
                        <span className="block text-xs text-zinc-500">{a.email}{!a.active && <> · <Badge tone="red">Disabled</Badge></>}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{ago(a.lastLoginAt)}</td>
                  <td className="px-4 py-2.5">
                    <AdminRow id={String(a._id)} active={a.active ?? true} self={String(a._id) === String(me._id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
