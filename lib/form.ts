export type State = { ok?: string; error?: string; secret?: string; rows?: string[] } | null

export class Invalid extends Error {}

export const HANDLE = /^[A-Za-z0-9_.-]{1,40}$/
export const REGNO = /^[A-Za-z0-9-]{3,20}$/
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const str = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? '').trim().slice(0, max)

export function link(fd: FormData, key: string) {
  const v = str(fd, key, 300)
  if (v && !/^https?:\/\/[^\s<>"]+\.[^\s<>"]+$/i.test(v)) throw new Invalid(`Enter a valid http(s) link for ${key}.`)
  return v || undefined
}

export function date(fd: FormData, key: string) {
  const v = str(fd, key, 10)
  return v && !isNaN(Date.parse(v)) ? new Date(v) : undefined
}

export const list = (fd: FormData, key: string) =>
  [...new Set(str(fd, key, 400).split(',').map(s => s.trim()).filter(Boolean))].slice(0, 15)

export async function attempt(fn: () => Promise<State>): Promise<State> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof Invalid) return { error: e.message }
    throw e
  }
}
