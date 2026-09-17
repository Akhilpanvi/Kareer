import { NextResponse, type NextRequest } from 'next/server'
import { refreshStalest } from '@/lib/platforms'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await refreshStalest(50_000))
}
