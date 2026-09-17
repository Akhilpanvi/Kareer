'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { parseCsv } from '@/lib/csv'
import { attempt, EMAIL, HANDLE, Invalid, REGNO, str, type State } from '@/lib/form'
import { emailFor, ensureSlug } from '@/lib/onboarding'
import { hashPassword, passwordIssue, tempPassword } from '@/lib/password'
import { cohortSync, PLATFORM_KEYS, refreshUser, syncAllHandles, syncHandles } from '@/lib/platforms'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'

const valid = (id: string) => /^[a-f0-9]{24}$/.test(id)

/** Invalidate only the list and, when given, that student's page — not the whole admin tree. */
function touched(id?: string) {
  revalidatePath('/admin')
  if (id) revalidatePath(`/admin/students/${id}`)
}

export async function resetPassword(id: string): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  const password = tempPassword()
  const r = await User.updateOne(
    { _id: id, role: 'student' },
    { $set: { passwordHash: await hashPassword(password), failedLogins: 0, mustChangePassword: true }, $unset: { lockedUntil: 1 }, $inc: { sessionVersion: 1 } },
  )
  return r.modifiedCount ? { ok: 'Temporary password issued. It will not be shown again.', secret: password } : { error: 'Student not found.' }
}

export async function resetRegistration(id: string): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  const r = await User.updateOne(
    { _id: id, role: 'student' },
    { $unset: { passwordHash: 1, registeredAt: 1, lockedUntil: 1 }, $set: { failedLogins: 0, mustChangePassword: false }, $inc: { sessionVersion: 1 } },
  )
  touched(id)
  return r.matchedCount ? { ok: 'Account setup reset. The student can set it up again at /register.' } : { error: 'Student not found.' }
}

export async function setActive(id: string, active: boolean): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  await User.updateOne({ _id: id, role: 'student' }, { $set: { active }, $inc: { sessionVersion: 1 } })
  touched(id)
  return { ok: active ? 'Account enabled.' : 'Account disabled.' }
}

export async function syncEveryone(): Promise<State> {
  await requireAdmin()
  const r = await cohortSync(45_000)
  touched()
  return r
    ? { ok: r.refreshed ? `Synced ${r.refreshed} record${r.refreshed === 1 ? '' : 's'} across ${r.users} student${r.users === 1 ? '' : 's'}${r.remaining ? `, ${r.remaining} left for the next run` : ''}.` : 'Everything is already up to date.' }
    : { error: 'A cohort sync ran recently. Try again later.' }
}

export async function refreshStudent(id: string): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  const n = await refreshUser(id, true)
  touched(id)
  return n ? { ok: `Synced ${n} platform${n > 1 ? 's' : ''}.` } : { error: 'Synced recently. Try again later.' }
}

function studentFields(fd: FormData) {
  const regNo = str(fd, 'regNo', 20).toUpperCase()
  const email = str(fd, 'email', 120).toLowerCase() || emailFor(regNo)
  const name = str(fd, 'name', 120)
  if (!regNo || !REGNO.test(regNo)) throw new Invalid('Enter a valid registration number (letters, numbers, dashes).')
  if (!name) throw new Invalid('Name is required.')
  if (!email || !EMAIL.test(email)) throw new Invalid('Enter a valid email address.')
  const cgpa = str(fd, 'cgpa', 5)
  if (cgpa && !(+cgpa >= 0 && +cgpa <= 10)) throw new Invalid('CGPA must be between 0 and 10.')
  const handles: Record<string, string> = {}
  for (const p of PLATFORM_KEYS) {
    const h = str(fd, p, 60).replace(/^@/, '')
    if (h && !HANDLE.test(h)) throw new Invalid(`Enter only the ${p} username, not a link.`)
    if (h) handles[p] = h
  }
  return {
    regNo, email, name,
    branch: str(fd, 'branch', 40) || undefined,
    batch: str(fd, 'batch', 20) || undefined,
    campus: str(fd, 'campus', 40) || undefined,
    section: str(fd, 'section', 20) || undefined,
    phone: str(fd, 'phone', 20) || undefined,
    cgpa: cgpa ? +cgpa : undefined,
    handles,
  }
}

const duplicate = (e: unknown) => (e as { code?: number })?.code === 11000

export async function createStudent(_: State, fd: FormData) {
  return attempt(async () => {
    await requireAdmin()
    const fields = studentFields(fd)
    const password = str(fd, 'password', 128)
    const issue = password && passwordIssue(password)
    if (issue) throw new Invalid(issue)
    let user
    try {
      user = await User.create({ ...fields, role: 'student', ...(password && { mustChangePassword: true, passwordHash: await hashPassword(password) }) })
    } catch (e) {
      if (duplicate(e)) throw new Invalid('A student with this registration number or email already exists.')
      throw e
    }
    await syncHandles(user._id, fields.handles)
    await ensureSlug(user._id, fields.name, fields.regNo)
    after(() => refreshUser(user._id))
    touched()
    return { ok: password ? 'Student added. They must change this password at first sign-in.' : 'Student added. They can now set up their account at /register.' }
  })
}

export async function updateStudent(id: string, _: State, fd: FormData) {
  return attempt(async () => {
    await requireAdmin()
    if (!valid(id)) throw new Invalid('Invalid student.')
    const fields = studentFields(fd)
    let r
    try {
      r = await User.updateOne({ _id: id, role: 'student' }, { $set: fields })
    } catch (e) {
      if (duplicate(e)) throw new Invalid('A student with this registration number or email already exists.')
      throw e
    }
    if (!r.matchedCount) throw new Invalid('Student not found.')
    await syncHandles(id, fields.handles)
    after(() => refreshUser(id))
    touched(id)
    return { ok: 'Student details updated.' }
  })
}

export async function deleteStudent(id: string): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid student.' }
  await Promise.all([User.deleteOne({ _id: id, role: 'student' }), PlatformStat.deleteMany({ user: id })])
  touched()
  return { ok: 'Student deleted.' }
}

const IMPORT_LIMIT = 5000
const cleanHandle = (v = '') => v.replace(/^https?:\/\/[^/]+\/(u\/|users\/|profile\/)?/i, '').split(/[/?]/)[0].trim().replace(/^@/, '')

export async function bulkImport(_: State, fd: FormData) {
  return attempt(async () => {
    await requireAdmin()
    const file = fd.get('file')
    const text = file instanceof File && file.size ? await file.text() : str(fd, 'csv', 2_000_000)
    if (!text.trim()) throw new Invalid('Provide a CSV file or paste rows.')
    const rows = parseCsv(text)
    if (!rows.length) throw new Invalid('No rows found. Include a header row: regNo,name,email,...')
    if (rows.length > IMPORT_LIMIT) throw new Invalid(`Import at most ${IMPORT_LIMIT.toLocaleString()} rows at a time.`)

    // Validate and de-duplicate by regNo (last row wins)
    let skipped = 0
    const byReg = new Map<string, { regNo: string; email: string; password?: string; handles: Record<string, string>; fields: Record<string, unknown> }>()
    for (const row of rows) {
      const regNo = (row.regNo || '').toUpperCase().trim()
      const email = (row.email || '').toLowerCase().trim() || (REGNO.test(regNo) ? emailFor(regNo) : '')
      const name = (row.name || '').trim()
      if (!REGNO.test(regNo) || !name || !EMAIL.test(email)) { skipped++; continue }
      const handles = Object.fromEntries(PLATFORM_KEYS.map(p => [p, cleanHandle(row[p])]).filter(([, h]) => h && HANDLE.test(h)))
      const fields: Record<string, unknown> = {
        name: name.slice(0, 120), email: email.slice(0, 120),
        ...Object.fromEntries((['branch', 'batch', 'campus', 'section', 'phone'] as const).filter(k => row[k]).map(k => [k, row[k].trim().slice(0, 40)])),
        ...(Object.keys(handles).length && { handles }),
      }
      if (row.cgpa && +row.cgpa >= 0 && +row.cgpa <= 10) fields.cgpa = +row.cgpa
      if (byReg.has(regNo)) skipped++
      byReg.set(regNo, { regNo, email, password: row.password?.trim() || undefined, handles, fields })
    }
    const list = [...byReg.values()]
    if (!list.length) throw new Invalid(`No valid rows. ${skipped} skipped — each row needs regNo, name and a valid email.`)

    // One read for existing students; new students without a password set up their account at /register
    const existing = new Set((await User.find({ regNo: { $in: list.map(r => r.regNo) } }).select('regNo').lean()).map(u => u.regNo))
    const withPassword = list.filter(r => !existing.has(r.regNo) && r.password)
    for (let i = 0; i < withPassword.length; i += 32)
      await Promise.all(withPassword.slice(i, i + 32).map(async r => {
        r.fields.passwordHash = await hashPassword(r.password!)
        r.fields.mustChangePassword = true
      }))

    // One bulk write; rows that conflict (e.g. an email used by another student) are reported as skipped
    const failed = new Set<number>()
    try {
      await User.bulkWrite(
        list.map(r => ({ updateOne: { filter: { regNo: r.regNo }, update: { $set: r.fields, $setOnInsert: { role: 'student' } }, upsert: true } })),
        { ordered: false },
      )
    } catch (e) {
      const errors = (e as { writeErrors?: { index: number } | { index: number }[] }).writeErrors
      if (!errors) throw e
      for (const w of [errors].flat()) failed.add(w.index)
    }
    const saved = list.filter((_, i) => !failed.has(i))

    const withHandles = saved.filter(r => Object.keys(r.handles).length)
    if (withHandles.length) {
      const users = await User.find({ regNo: { $in: withHandles.map(r => r.regNo) } }).select('handles').lean()
      await syncAllHandles(users.map(u => ({ user: u._id, handles: u.handles ?? {} })))
    }

    touched()
    const created = saved.filter(r => !existing.has(r.regNo))
    return {
      ok: `${created.length} created, ${saved.length - created.length} updated${skipped + failed.size ? `, ${skipped + failed.size} skipped` : ''}. New students set up their account at /register.`,
    }
  })
}

/** Plain form action (progressive enhancement): checkbox selection + intent, redirects back with a status message. */
export async function bulkStudents(fd: FormData) {
  await requireAdmin()
  const back = str(fd, 'back', 300) || '/admin'
  const to = (msg: string) => redirect(`${back}${back.includes('?') ? '&' : '?'}msg=${encodeURIComponent(msg)}`)
  const ids = fd.getAll('ids').map(String).filter(valid)
  const intent = str(fd, 'intent', 20)
  if (!ids.length) to('Select at least one student.')

  if (intent === 'delete') {
    const [, users] = await Promise.all([PlatformStat.deleteMany({ user: { $in: ids } }), User.deleteMany({ _id: { $in: ids }, role: 'student' })])
    to(`${users.deletedCount} student${users.deletedCount === 1 ? '' : 's'} deleted.`)
  } else {
    const active = intent === 'enable'
    const r = await User.updateMany({ _id: { $in: ids }, role: 'student' }, { $set: { active }, $inc: { sessionVersion: 1 } })
    to(`${r.modifiedCount} student${r.modifiedCount === 1 ? '' : 's'} ${active ? 'enabled' : 'disabled'}.`)
  }
}

// -- Placement Cell (admin) accounts --

export async function createAdmin(_: State, fd: FormData) {
  return attempt(async () => {
    await requireAdmin()
    const email = str(fd, 'email', 120).toLowerCase()
    const name = str(fd, 'name', 120) || 'Placement Cell'
    if (!email || !EMAIL.test(email)) throw new Invalid('Enter a valid email address.')
    const password = tempPassword()
    try {
      await User.create({ regNo: `ADMIN-${Date.now().toString(36).toUpperCase()}`, email, name, role: 'admin', mustChangePassword: true, passwordHash: await hashPassword(password) })
    } catch (e) {
      if (duplicate(e)) throw new Invalid('An account with this email already exists.')
      throw e
    }
    revalidatePath('/admin/team')
    return { ok: 'Admin account created.', secret: password }
  })
}

export async function setAdminActive(id: string, active: boolean): Promise<State> {
  const me = await requireAdmin()
  if (!valid(id)) return { error: 'Invalid account.' }
  if (String(me._id) === id && !active) return { error: 'You cannot disable your own account.' }
  await User.updateOne({ _id: id, role: 'admin' }, { $set: { active }, $inc: { sessionVersion: 1 } })
  revalidatePath('/admin/team')
  return { ok: active ? 'Account enabled.' : 'Account disabled.' }
}

export async function resetAdminPassword(id: string): Promise<State> {
  await requireAdmin()
  if (!valid(id)) return { error: 'Invalid account.' }
  const password = tempPassword()
  const r = await User.updateOne(
    { _id: id, role: 'admin' },
    { $set: { passwordHash: await hashPassword(password), failedLogins: 0, mustChangePassword: true }, $unset: { lockedUntil: 1 }, $inc: { sessionVersion: 1 } },
  )
  return r.modifiedCount ? { ok: 'Temporary password issued. It will not be shown again.', secret: password } : { error: 'Account not found.' }
}

export async function deleteAdmin(id: string): Promise<State> {
  const me = await requireAdmin()
  if (!valid(id)) return { error: 'Invalid account.' }
  if (String(me._id) === id) return { error: 'You cannot delete your own account.' }
  const count = await User.countDocuments({ role: 'admin' })
  if (count <= 1) return { error: 'At least one admin account must remain.' }
  await User.deleteOne({ _id: id, role: 'admin' })
  revalidatePath('/admin/team')
  return { ok: 'Admin account removed.' }
}
