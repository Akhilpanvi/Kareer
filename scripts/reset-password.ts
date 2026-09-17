/**
 * npm run reset-password -- <email|regNo>
 *
 * Issues a temporary password for any account (admin or student), clears lockout and
 * signs the account out everywhere. Needs MONGODB_URI — run it only from a trusted machine.
 */
import mongoose from 'mongoose'
import { db } from '../lib/db'
import { hashPassword, tempPassword } from '../lib/password'
import { User } from '../models/User'

const id = process.argv[2]?.trim()
if (!id) {
  console.error('usage: npm run reset-password -- <email|regNo>')
  process.exit(1)
}

await db()
const password = tempPassword()
const user = await User.findOneAndUpdate(
  id.includes('@') ? { email: id.toLowerCase() } : { regNo: id.toUpperCase() },
  { $set: { passwordHash: await hashPassword(password), failedLogins: 0, active: true, mustChangePassword: true }, $unset: { lockedUntil: 1 }, $inc: { sessionVersion: 1 } },
  { returnDocument: 'after' },
).select('email role').lean()

if (!user) console.error(`No account found for ${id}`)
else console.log(`${user.role} ${user.email}\ntemporary password: ${password}\nSign in and change it from Profile.`)
await mongoose.disconnect()
process.exit(user ? 0 : 1)
