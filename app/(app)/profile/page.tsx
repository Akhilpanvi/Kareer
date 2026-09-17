import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { loadStudent } from '@/lib/data'
import { PLATFORMS } from '@/lib/platforms'
import { updateProfile } from '@/app/actions/profile'
import { changePassword } from '@/app/actions/auth'
import { ActionForm } from '@/components/forms'
import { Card, Field, PageHeader } from '@/components/ui'
import { StatusLine } from '@/components/overview'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const me = await requireUser()
  const s = await loadStudent(me._id)
  if (!s) notFound()
  const { user, stats } = s
  const official = [['Name', user.name], ['Registration no.', user.regNo], ['Email', user.email], ['Branch', user.branch], ['Batch', user.batch], ['Campus', user.campus], ['Section', user.section]]

  return (
    <>
      <PageHeader title="Profile" description="Keep your details current — recruiters and the Placement Cell see this profile." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="About you">
            <ActionForm action={updateProfile} submit="Save profile" className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Headline"><input name="headline" maxLength={120} defaultValue={user.headline ?? ''} className="input" placeholder="Full-stack developer · ML enthusiast" /></Field></div>
                <div className="sm:col-span-2"><Field label="Bio"><textarea name="bio" rows={4} maxLength={1000} defaultValue={user.bio ?? ''} className="input" /></Field></div>
                <Field label="Phone"><input name="phone" maxLength={20} defaultValue={user.phone ?? ''} className="input" inputMode="tel" /></Field>
                <Field label="CGPA"><input name="cgpa" type="number" step="0.01" min={0} max={10} defaultValue={user.cgpa ?? ''} className="input" /></Field>
              </div>
              <fieldset className="grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-3">
                <legend className="mb-3 text-sm font-semibold">Links</legend>
                <Field label="LinkedIn"><input name="linkedin" type="url" defaultValue={user.links?.linkedin ?? ''} className="input" placeholder="https://linkedin.com/in/…" /></Field>
                <Field label="Portfolio"><input name="portfolio" type="url" defaultValue={user.links?.portfolio ?? ''} className="input" placeholder="https://" /></Field>
                <Field label="Resume"><input name="resume" type="url" defaultValue={user.links?.resume ?? ''} className="input" placeholder="https://drive.google.com/…" /></Field>
              </fieldset>
              <fieldset className="grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-2">
                <legend className="mb-1 text-sm font-semibold">Coding platforms</legend>
                <p className="-mt-1 mb-2 text-xs text-zinc-500 sm:col-span-2">Usernames only. Stats sync automatically and refresh twice a day.</p>
                {Object.entries(PLATFORMS).map(([key, p]) => (
                  <Field key={key} label={p.label}>
                    <input name={key} defaultValue={user.handles?.[key] ?? ''} className="input" placeholder="username" pattern="@?[A-Za-z0-9_.\-]{1,40}" autoCapitalize="off" spellCheck={false} />
                    <span className="mt-1 block"><StatusLine stat={stats[key]} /></span>
                  </Field>
                ))}
              </fieldset>
            </ActionForm>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Official details">
            <dl className="space-y-3 text-sm">
              {official.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="truncate text-right font-medium">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-zinc-500">Managed by the Placement Cell. Contact them for corrections.</p>
          </Card>
          <Card title="Change password">
            <ActionForm action={changePassword} submit="Update password" reset>
              <Field label="Current password"><input name="current" type="password" required autoComplete="current-password" className="input" /></Field>
              <Field label="New password" hint="At least 10 characters."><input name="next" type="password" required minLength={10} autoComplete="new-password" className="input" /></Field>
              <Field label="Confirm new password"><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="input" /></Field>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  )
}
