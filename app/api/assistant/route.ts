import { NextResponse, type NextRequest } from 'next/server'
import { assistantEnabled, askGemini, DAILY_LIMIT, studentContext, type Turn } from '@/lib/assistant'
import { currentUser } from '@/lib/auth'
import { loadStudent } from '@/lib/data'
import { User } from '@/models/User'

export const maxDuration = 30

const GAP_MS = 4000
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET() {
  if (!assistantEnabled()) return fail('The assistant is not available.', 404)
  const me = await currentUser()
  if (!me || me.role !== 'student') return fail('Sign in as a student.', 401)
  const u = await User.findById(me._id).select('+aiDay +aiCount').lean()
  const used = u?.aiDay === new Date().toISOString().slice(0, 10) ? (u.aiCount ?? 0) : 0
  return NextResponse.json({ remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  if (!assistantEnabled()) return fail('The assistant is not available.', 404)
  if (req.headers.get('origin') !== req.nextUrl.origin) return fail('Forbidden.', 403)
  const me = await currentUser()
  if (!me || me.role !== 'student' || me.mustChangePassword) return fail('Sign in as a student to use the assistant.', 401)

  const body = await req.json().catch(() => null)
  const turns: Turn[] = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-7)
    .filter((t: Turn) => (t?.role === 'user' || t?.role === 'model') && typeof t.text === 'string' && t.text.trim())
    .map((t: Turn) => ({ role: t.role, text: t.text.trim().slice(0, t.role === 'user' ? 500 : 1500) }))
  if (turns.at(-1)?.role !== 'user') return fail('Send a message.', 400)
  while (turns[0]?.role !== 'user') turns.shift()

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const used = await User.findOneAndUpdate(
    {
      _id: me._id,
      $and: [
        { $or: [{ aiDay: { $ne: today } }, { aiCount: { $lt: DAILY_LIMIT } }] },
        { $or: [{ aiAt: { $exists: false } }, { aiAt: { $lt: new Date(now.getTime() - GAP_MS) } }] },
      ],
    },
    [{ $set: { aiCount: { $cond: [{ $eq: ['$aiDay', today] }, { $add: ['$aiCount', 1] }, 1] }, aiDay: today, aiAt: now } }],
    { returnDocument: 'after', updatePipeline: true },
  ).select('+aiCount').lean()
  if (!used) {
    const u = await User.findById(me._id).select('+aiDay +aiCount').lean()
    return u?.aiDay === today && (u.aiCount ?? 0) >= DAILY_LIMIT
      ? fail(`You've used today's ${DAILY_LIMIT} questions. Try again tomorrow.`, 429)
      : fail('Please wait a few seconds between messages.', 429)
  }

  const student = await loadStudent(me._id)
  if (!student) return fail('Profile not found.', 404)
  try {
    const reply = await askGemini(studentContext(student), turns)
    return NextResponse.json({ reply, remaining: Math.max(0, DAILY_LIMIT - (used.aiCount ?? 0)) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('assistant failed:', e)
    await User.updateOne({ _id: me._id, aiDay: today, aiCount: { $gt: 0 } }, { $inc: { aiCount: -1 } })
    return fail('The assistant is unavailable right now. Please try again later.', 502)
  }
}
