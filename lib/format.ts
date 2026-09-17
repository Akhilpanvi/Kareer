export function ago(d?: Date | string | null) {
  if (!d) return 'never'
  const s = (Date.now() - +new Date(d)) / 1000
  for (const [unit, n] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]] as const)
    if (s >= n) return `${Math.floor(s / n)} ${unit}${Math.floor(s / n) > 1 ? 's' : ''} ago`
  return 'just now'
}

export const fmt = (n?: number | null) => (n == null ? '—' : n.toLocaleString('en-IN'))
export const monthYear = (d?: Date | string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '')
export const initials = (name = '') => name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
