/**
 * npm run seed -- [file.csv] [--reset-passwords]
 *
 * CSV columns: regNo,name,email,branch,batch,campus,section,phone,github,leetcode,codechef,codeforces,password
 * New students get a random password unless one is given. Existing students are updated
 * in place and keep their password unless --reset-passwords. Issued credentials are written
 * to data/credentials-<timestamp>.csv — distribute them securely, then delete the file.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import mongoose from 'mongoose'
import { db } from '../lib/db'
import { csvCell, parseCsv } from '../lib/csv'
import { hashPassword, passwordIssue, tempPassword } from '../lib/password'
import { PLATFORM_KEYS, syncHandles } from '../lib/platforms'
import { User } from '../models/User'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--')) ?? 'data/students.csv'
const reset = args.includes('--reset-passwords')

const handle = (v = '') => v.replace(/^https?:\/\/[^/]+\/(u\/|users\/|profile\/)?/i, '').split(/[/?]/)[0].trim()

await db()
const issued: string[][] = []

const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()
if (adminEmail && !(await User.exists({ email: adminEmail }))) {
  const password = process.env.ADMIN_PASSWORD || tempPassword()
  if (passwordIssue(password)) throw new Error(`ADMIN_PASSWORD: ${passwordIssue(password)}`)
  await User.create({ regNo: 'ADMIN', email: adminEmail, name: 'Placement Cell', role: 'admin', mustChangePassword: !process.env.ADMIN_PASSWORD, passwordHash: await hashPassword(password) })
  issued.push(['ADMIN', adminEmail, process.env.ADMIN_PASSWORD ? '(from ADMIN_PASSWORD)' : password])
  console.log(`created admin ${adminEmail}`)
}

let created = 0, updated = 0
for (const row of parseCsv(readFileSync(file, 'utf8'))) {
  if (!row.regNo || !row.name || !row.email) {
    console.warn('skipped row without regNo/name/email:', row)
    continue
  }
  const regNo = row.regNo.toUpperCase()
  const handles = Object.fromEntries(PLATFORM_KEYS.map(p => [p, handle(row[p])]).filter(([, h]) => h))
  const fields = {
    name: row.name, email: row.email.toLowerCase(),
    ...Object.fromEntries(['branch', 'batch', 'campus', 'section', 'phone'].filter(k => row[k]).map(k => [k, row[k]])),
  }
  const existing = await User.findOne({ regNo }).select('_id handles')
  let password: string | undefined
  if (!existing || reset) password = row.password || tempPassword()

  const user = await User.findOneAndUpdate(
    { regNo },
    {
      $set: { ...fields, ...(Object.keys(handles).length && { handles }), ...(password && { passwordHash: await hashPassword(password), mustChangePassword: true }) },
      ...(existing && password && { $inc: { sessionVersion: 1 } }),
      $setOnInsert: { role: 'student' },
    },
    { upsert: true, returnDocument: 'after' },
  ).lean()
  await syncHandles(user!._id, user!.handles ?? {})
  if (password) issued.push([regNo, fields.email, password])
  existing ? updated++ : created++
}

if (issued.length) {
  const out = `data/credentials-${Date.now()}.csv`
  writeFileSync(out, ['regNo,email,password', ...issued.map(r => r.map(csvCell).join(','))].join('\n'), { mode: 0o600 })
  console.log(`credentials written to ${out}`)
}
console.log(`students: ${created} created, ${updated} updated`)
await mongoose.disconnect()
