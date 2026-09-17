'use server'
import { requireAdmin } from '@/lib/auth'
import { assistantEnabled } from '@/lib/assistant'
import { str } from '@/lib/form'
import { EMPTY, parseJd, shortlist, type Candidate, type Criteria } from '@/lib/shortlist'
import { takeCheck } from '@/lib/onboarding'
import { seal } from '@/lib/session'

export type Result = { error: string } | { criteria: Criteria; rows: Candidate[]; considered: number; token: string }

export async function runShortlist(_: Result | null, fd: FormData): Promise<Result> {
  const me = await requireAdmin()
  const jd = str(fd, 'jd', 8000)
  if (jd.length < 40) return { error: 'Paste the job description (at least a few lines).' }
  if (!assistantEnabled()) return { error: 'Shortlisting needs GEMINI_API_KEY.' }
  if (!(await takeCheck(me._id))) return { error: 'Daily shortlisting limit reached. Try again tomorrow.' }

  let criteria: Criteria
  try {
    criteria = await parseJd(jd)
  } catch (e) {
    console.error('JD parse failed:', e)
    return { error: 'Could not read that job description. Try again in a moment.' }
  }
  // Manual overrides win over whatever the JD implied
  const num = (k: string, max: number) => {
    const v = str(fd, k, 6)
    return v && +v > 0 && +v <= max ? +v : null
  }
  criteria = { ...EMPTY, ...criteria, minCgpa: num('minCgpa', 10) ?? criteria.minCgpa, minClass10: num('minClass10', 100) ?? criteria.minClass10, minClass12: num('minClass12', 100) ?? criteria.minClass12 }
  const batch = str(fd, 'batch', 20)
  if (batch) criteria.batches = [batch]

  const { rows, considered } = await shortlist(criteria)
  return { criteria, rows, considered, token: await seal({ c: criteria }, 3600) }
}
