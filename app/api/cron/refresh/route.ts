import { NextResponse, type NextRequest } from 'next/server'
import { refreshStalest } from '@/lib/platforms'
import { db } from '@/lib/db'
import { User } from '@/models/User'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db()
  const stale = await User.deleteMany({ emailVerified: false, createdAt: { $lt: new Date(Date.now() - 7 * 86400_000) } })
  return NextResponse.json({ ...(await refreshStalest(45_000)), removedUnverified: stale.deletedCount })
}
