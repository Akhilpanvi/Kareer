import 'server-only'
import type { Student } from './data'
import { breakdown, MAX } from './score'

export const assistantEnabled = () => !!process.env.GEMINI_API_KEY
export const DAILY_LIMIT = Number(process.env.GEMINI_DAILY_LIMIT ?? 20)

const SYSTEM = `You are Kloop Coach, the KL University Placement Cell assistant inside Kloop.
Help the signed-in student improve placement preparation: DSA practice, coding contests, GitHub and projects, skills, certifications, interviews and profile strength.
Rules:
- Use only the STUDENT CONTEXT below for facts about the student. Never invent numbers, companies, deadlines or placement results.
- You cannot view or change any records. If asked to update something, tell them which Kloop page to use (Profile, Skills & Achievements, Platform Statistics).
- You have no information about other students, rankings among peers, admins or passwords. Decline such requests.
- Decline topics unrelated to career preparation, and never write complete assignment or exam answers.
- Be specific and practical. Reply in plain text under 180 words; short bullet lines with "-" are fine.`

/* eslint-disable @typescript-eslint/no-explicit-any */
export function studentContext({ user, stats }: Student) {
  const lc = stats.leetcode?.data as any, gh = stats.github?.data as any, cc = stats.codechef?.data as any, cf = stats.codeforces?.data as any
  const parts = breakdown(user, user.metrics ?? {})
  return JSON.stringify({
    firstName: user.name.split(/\s+/)[0],
    branch: user.branch, batch: user.batch, cgpa: user.cgpa,
    headline: user.headline,
    profileStrength: { score: user.score ?? 0, outOf: 100, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, `${Math.round(v)}/${MAX[k as keyof typeof MAX]}`])) },
    skills: user.skills?.map(s => `${s.name} (${s.level})`),
    projects: user.projects?.slice(0, 10).map(p => ({ title: p.title, tech: p.tech })),
    certifications: user.certifications?.slice(0, 10).map(c => c.name),
    achievements: user.achievements?.slice(0, 10).map(a => a.title),
    leetcode: lc && { solved: lc.solved, contestRating: lc.contest?.rating, topTopics: lc.topics?.slice(0, 8).map((t: any) => `${t.name}:${t.n}`), languages: lc.languages?.slice(0, 4).map((l: any) => l.name) },
    github: gh && { repos: user.metrics?.ghRepos, stars: gh.stars, contributionsLastYear: gh.contributions, languages: gh.languages?.slice(0, 6).map((l: any) => l.name), recentRepos: gh.repos?.slice(0, 5).map((r: any) => r.name) },
    codechef: cc && { rating: cc.rating, stars: cc.stars, highest: cc.highest, solved: cc.solved },
    codeforces: cf && { rating: cf.rating, rank: cf.rank },
    notConnected: ['github', 'leetcode', 'codechef', 'codeforces'].filter(p => !stats[p]?.data),
  })
}

export type Turn = { role: 'user' | 'model'; text: string }

export async function askGemini(context: string, turns: Turn[]) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${SYSTEM}\n\nSTUDENT CONTEXT (JSON):\n${context}` }] },
      contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: { maxOutputTokens: 1200, thinkingConfig: { thinkingLevel: 'low' } },
    }),
    signal: AbortSignal.timeout(25_000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Gemini responded ${res.status}`)
  const data = await res.json()
  const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p: any) => !p.thought).map((p: any) => p.text ?? '').join('').trim()
  if (!text) throw new Error(`Gemini returned no text (${data.candidates?.[0]?.finishReason ?? data.promptFeedback?.blockReason ?? 'unknown'})`)
  return text.slice(0, 2500)
}
