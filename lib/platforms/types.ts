export type Day = Record<string, number> // 'YYYY-MM-DD' -> count

export type Fetched = {
  data: Record<string, unknown>
  metrics: Record<string, number> // merged into User.metrics
  value: number // headline number tracked over time
}

export type Platform = {
  label: string
  url: (handle: string) => string
  unit: string
  fetch: (handle: string) => Promise<Fetched | null> // null = account not found
}

export const UA = 'Mozilla/5.0 (compatible; KloopBot/1.0; +https://kloop.klef.me)'

export async function get(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': UA, ...init.headers } })
  if (res.status === 429 || res.status >= 500) throw new Error(`${new URL(url).host} responded ${res.status}`)
  return res
}

export const day = (d: Date | number) => new Date(d).toISOString().slice(0, 10)
