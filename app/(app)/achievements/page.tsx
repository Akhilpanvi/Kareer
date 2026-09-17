import type { Metadata } from 'next'
import { ExternalLink, Trash2 } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { monthYear } from '@/lib/format'
import { addItem, addSkill, removeItem, removeSkill, type Kind } from '@/app/actions/profile'
import { ActionForm } from '@/components/forms'
import { Badge, Card, Empty, Field, PageHeader } from '@/components/ui'
import { User } from '@/models/User'

export const metadata: Metadata = { title: 'Skills & Achievements' }

const Remove = ({ action, label }: { action: () => Promise<void>; label: string }) => (
  <form action={action}>
    <button className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${label}`} title="Remove"><Trash2 className="size-4" /></button>
  </form>
)

function AddPanel({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <details className="group mb-5 rounded-lg border border-zinc-200 bg-zinc-50/60 open:bg-white">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-brand-700 marker:hidden">+ {label}</summary>
      <div className="border-t border-zinc-200 p-4">{children}</div>
    </details>
  )
}

function Item({ kind, id, title, meta, body, url, tags }: { kind: Kind; id: string; title: string; meta?: string; body?: string | null; url?: string | null; tags?: string[] }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700" aria-label="Open link"><ExternalLink className="size-3.5" /></a>}
        </div>
        {meta && <p className="text-xs text-zinc-500">{meta}</p>}
        {body && <p className="mt-1 text-sm text-zinc-600">{body}</p>}
        {!!tags?.length && <div className="mt-2 flex flex-wrap gap-1">{tags.map(t => <Badge key={t}>{t}</Badge>)}</div>}
      </div>
      <Remove action={removeItem.bind(null, kind, id)} label={title} />
    </li>
  )
}

export default async function AchievementsPage() {
  const me = await requireUser()
  await db()
  const u = await User.findById(me._id).select('skills projects certifications achievements').lean()
  if (!u) return null
  const levels = ['advanced', 'intermediate', 'beginner'] as const

  return (
    <>
      <PageHeader title="Skills & Achievements" description="Everything here counts toward your placement readiness score." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Skills" className="lg:col-span-2">
          <AddPanel label="Add skills">
            <ActionForm action={addSkill} submit="Add" reset className="grid items-end gap-3 sm:grid-cols-[1fr_180px_auto]">
              <Field label="Skills" hint="Separate multiple skills with commas."><input name="name" required className="input" placeholder="React, Node.js, SQL" /></Field>
              <Field label="Level">
                <select name="level" className="input" defaultValue="intermediate">
                  {[...levels].reverse().map(l => <option key={l} value={l} className="capitalize">{l[0].toUpperCase() + l.slice(1)}</option>)}
                </select>
              </Field>
            </ActionForm>
          </AddPanel>
          {u.skills?.length ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {levels.map(level => (
                <div key={level}>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{level}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {u.skills.filter(s => s.level === level).map(s => (
                      <li key={s.name} className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white py-0.5 pr-0.5 pl-2 text-sm">
                        {s.name}
                        <form action={removeSkill.bind(null, s.name!)}>
                          <button className="rounded px-1 text-zinc-400 hover:text-red-600" aria-label={`Remove ${s.name}`}>×</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : <Empty>List the technologies you are comfortable with.</Empty>}
        </Card>

        <div id="projects" className="scroll-mt-24 lg:col-span-2">
          <Card title="Projects">
            <AddPanel label="Add project">
              <ActionForm action={addItem.bind(null, 'projects')} submit="Add project" reset className="grid gap-4 sm:grid-cols-2">
                <Field label="Title"><input name="title" required maxLength={120} className="input" /></Field>
                <Field label="Completed"><input name="date" type="date" className="input" /></Field>
                <div className="sm:col-span-2"><Field label="Description"><textarea name="description" rows={3} maxLength={600} className="input" /></Field></div>
                <div className="sm:col-span-2"><Field label="Tech stack" hint="Comma separated."><input name="tech" className="input" placeholder="Next.js, MongoDB" /></Field></div>
                <Field label="Live URL"><input name="url" type="url" className="input" placeholder="https://" /></Field>
                <Field label="Repository"><input name="repo" type="url" className="input" placeholder="https://github.com/…" /></Field>
              </ActionForm>
            </AddPanel>
            {u.projects?.length ? (
              <ul className="-my-3.5 divide-y divide-zinc-100">
                {u.projects.map(p => <Item key={String(p._id)} kind="projects" id={String(p._id)} title={p.title!} meta={monthYear(p.date)} body={p.description} url={p.url || p.repo} tags={p.tech} />)}
              </ul>
            ) : <Empty>Add projects that show what you can build.</Empty>}
          </Card>
        </div>

        <div id="certifications" className="scroll-mt-24">
          <Card title="Certifications">
            <AddPanel label="Add certification">
              <ActionForm action={addItem.bind(null, 'certifications')} submit="Add" reset className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Name"><input name="name" required maxLength={150} className="input" placeholder="AWS Certified Cloud Practitioner" /></Field></div>
                <Field label="Issuer"><input name="issuer" maxLength={100} className="input" /></Field>
                <Field label="Issued"><input name="date" type="date" className="input" /></Field>
                <div className="sm:col-span-2"><Field label="Credential URL"><input name="url" type="url" className="input" placeholder="https://" /></Field></div>
              </ActionForm>
            </AddPanel>
            {u.certifications?.length ? (
              <ul className="-my-3.5 divide-y divide-zinc-100">
                {u.certifications.map(c => <Item key={String(c._id)} kind="certifications" id={String(c._id)} title={c.name!} meta={[c.issuer, monthYear(c.date)].filter(Boolean).join(' · ')} url={c.url} />)}
              </ul>
            ) : <Empty>No certifications yet.</Empty>}
          </Card>
        </div>

        <div id="achievements" className="scroll-mt-24">
          <Card title="Achievements">
            <AddPanel label="Add achievement">
              <ActionForm action={addItem.bind(null, 'achievements')} submit="Add" reset className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Title"><input name="title" required maxLength={150} className="input" placeholder="Winner, Smart India Hackathon" /></Field></div>
                <Field label="Date"><input name="date" type="date" className="input" /></Field>
                <div className="sm:col-span-2"><Field label="Details"><textarea name="description" rows={2} maxLength={400} className="input" /></Field></div>
              </ActionForm>
            </AddPanel>
            {u.achievements?.length ? (
              <ul className="-my-3.5 divide-y divide-zinc-100">
                {u.achievements.map(a => <Item key={String(a._id)} kind="achievements" id={String(a._id)} title={a.title!} meta={monthYear(a.date)} body={a.description} />)}
              </ul>
            ) : <Empty>Hackathons, contests, publications, awards.</Empty>}
          </Card>
        </div>
      </div>
    </>
  )
}
