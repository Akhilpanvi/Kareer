import type { LucideIcon } from 'lucide-react'
import { initials } from '@/lib/format'

export function Card({ title, action, children, className = '', icon: Icon }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            {Icon && <Icon className="size-4 text-zinc-400" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
        {label}
        {Icon && <Icon className="size-4 text-zinc-400" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-zinc-500">{hint}</div>}
    </div>
  )
}

const tones = {
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
}

export function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">{children}</p>
}

export function Avatar({ name, src, size = 'size-10' }: { name: string; src?: string | null; size?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover ring-1 ring-zinc-200`} referrerPolicy="no-referrer" />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100`}>{initials(name)}</span>
  )
}

export function Meter({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100" role="meter" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  )
}

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/kl-seal.png" alt="KL University" className="size-9" />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-zinc-900">Kareers</span>
        {!compact && <span className="block text-[11px] text-zinc-500">Placement Cell · KL University</span>}
      </span>
    </span>
  )
}
