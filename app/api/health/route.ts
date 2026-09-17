import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Reports configuration presence and DB reachability only — never values, hosts or messages with secrets.
export async function GET() {
  const uri = process.env.MONGODB_URI ?? ''
  const env = {
    MONGODB_URI: !!uri,
    MONGODB_URI_scheme: /^mongodb(\+srv)?:\/\//.test(uri),
    MONGODB_URI_has_db_name: /\.net\/[^/?]+/.test(uri) || /:\d+\/[^/?]+/.test(uri),
    MONGODB_URI_has_quotes_or_spaces: /^["']|["']$|\s/.test(uri),
    SESSION_SECRET: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
    CRON_SECRET: !!process.env.CRON_SECRET,
    SMTP: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
  }
  let database = 'ok'
  try {
    await db()
    await mongoose.connection.db!.admin().ping()
  } catch (e) {
    const err = e as { name?: string; codeName?: string; code?: number; message?: string }
    database = [err.name, err.codeName ?? err.code, err.message?.replace(/mongodb(\+srv)?:\/\/\S+/g, '<uri>').slice(0, 120)].filter(Boolean).join(' · ')
  }
  const ok = database === 'ok' && env.SESSION_SECRET
  return NextResponse.json({ ok, database, env }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
