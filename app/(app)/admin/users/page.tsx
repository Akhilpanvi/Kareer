import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { QueryFilter } from 'mongoose'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { ago, fmt } from '@/lib/format'
import { Avatar, Badge, PageHeader, Stat } from '@/components/ui'
import { User, type UserDoc } from '@/models/User'

export const metadata: Metadata = { title: 'Users' }

type Params = { q?: string; role?: string; status?: string; page?: string }
const PAGE = 25
const STATUS: Record<string, QueryFilter<UserDoc>> = {
  active: { active: true, passwordHash: { $exists: true } },
  unregistered: { role: 'student', passwordHash: { $exists: false } },
  disabled: { active: false },
  never: { passwordHash: { $exists: true }, lastLoginAt: { $exists: false } },
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const filter: QueryFilter<UserDoc> = { ...(STATUS[params.status ?? ''] ?? {}) }
  if (params.role === 'student' || params.role === 'admin') filter.role = params.role
  const q = params.q?.trim().slice(0, 60)
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { email: rx }, { regNo: rx }]
  }
  await db()
  const week = new Date(Date.now() - 7 * 86400_000)
  const [rows, total, admins, students, unregistered, recent] = await Promise.all([
    User.find(filter).sort({ lastLoginAt: -1, createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE)
      .select({ name: 1, email: 1, regNo: 1, role: 1, active: 1, mustChangePassword: 1, lastLoginAt: 1, createdAt: 1, passwordHash: 1 }).lean(),
    User.countDocuments(filter),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', passwordHash: { $exists: false } }),
    User.countDocuments({ lastLoginAt: { $gte: week } }),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const qs = (patch: Params) => '?' + new URLSearchParams(Object.entries({ ...params, ...patch }).filter(([, v]) => v) as [string, string][]).toString()
  const status = (u: (typeof rows)[number]) =>
    !u.active ? <Badge tone="red">Disabled</Badge>
      : !u.passwordHash ? <Badge tone="amber">Not registered</Badge>
      : u.mustChangePassword ? <Badge tone="amber">Temporary password</Badge>
      : <Badge tone="green">Active</Badge>

  return (
    <>
      <PageHeader title="Users" description="Every admin and student account, with sign-in activity." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Admins" value={fmt(admins)} />
        <Stat label="Students" value={fmt(students)} hint={`${fmt(students - unregistered)} registered`} />
        <Stat label="Not registered" value={fmt(unregistered)} hint="uploaded, awaiting setup" />
        <Stat label="Signed in (7 days)" value={fmt(recent)} />
      </div>

      <section className="card overflow-hidden">
        <nav className="flex gap-1 border-b border-zinc-100 px-3 pt-3" aria-label="Filter by role">
          {([['', 'All', admins + students], ['student', 'Students', students], ['admin', 'Admins', admins]] as const).map(([value, label, count]) => {
            const active = (params.role ?? '') === value
            return (
              <Link
                key={label}
                href={qs({ role: value, page: '' })}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
              >
                {label}<span className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${active ? 'bg-brand-50 text-brand-700' : 'bg-zinc-100 text-zinc-600'}`}>{fmt(count)}</span>
              </Link>
            )
          })}
        </nav>

        <form className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
          <input type="hidden" name="role" value={params.role ?? ''} />
          <label className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="q" defaultValue={params.q} placeholder="Search name, email, reg. no" className="input pl-9" aria-label="Search" />
          </label>
          <select name="status" defaultValue={params.status ?? ''} className="input w-auto" aria-label="Status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="unregistered">Not registered</option>
            <option value="never">Never signed in</option>
            <option value="disabled">Disabled</option>
          </select>
          <button className="btn-primary">Apply</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">User</th>
                {!params.role && <th className="px-4 py-2.5">Role</th>}
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Last sign-in</th>
                <th className="px-4 py-2.5">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(u => (
                <tr key={String(u._id)} className="hover:bg-zinc-50/70">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="size-8" />
                      <span className="min-w-0">
                        {u.role === 'student'
                          ? <Link href={`/admin/students/${u._id}`} prefetch={false} className="block truncate font-medium hover:text-brand-700">{u.name}</Link>
                          : <Link href="/admin/team" prefetch={false} className="block truncate font-medium hover:text-brand-700">{u.name}</Link>}
                        <span className="block truncate text-xs text-zinc-500">{u.email}{u.role === 'student' && ` · ${u.regNo}`}</span>
                      </span>
                    </div>
                  </td>
                  {!params.role && <td className="px-4 py-2.5"><Badge tone={u.role === 'admin' ? 'brand' : 'zinc'}>{u.role === 'admin' ? 'Admin' : 'Student'}</Badge></td>}
                  <td className="px-4 py-2.5">{status(u)}</td>
                  <td className="px-4 py-2.5 text-zinc-600" title={u.lastLoginAt?.toLocaleString('en-IN')}>{u.lastLoginAt ? ago(u.lastLoginAt) : 'Never'}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{ago(u.createdAt)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={params.role ? 4 : 5} className="px-4 py-10 text-center text-zinc-500">No users match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm text-zinc-500">
          <span>{total ? `${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, total)} of ${fmt(total)}` : '0 results'}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={qs({ page: String(page - 1) })} prefetch={false} className="btn-outline py-1.5">Previous</Link> : <span className="btn-outline pointer-events-none py-1.5 opacity-50">Previous</span>}
            {page < pages ? <Link href={qs({ page: String(page + 1) })} prefetch={false} className="btn-outline py-1.5">Next</Link> : <span className="btn-outline pointer-events-none py-1.5 opacity-50">Next</span>}
          </div>
        </footer>
      </section>
    </>
  )
}
