'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Award, BarChart3, LayoutDashboard, ShieldCheck, UserRound, Users } from 'lucide-react'

const STUDENT = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/dashboard' },
  { href: '/profile', label: 'Profile', icon: UserRound, match: (p: string) => p === '/profile' },
  { href: '/achievements', label: 'Skills & Achievements', icon: Award, match: (p: string) => p === '/achievements' },
  { href: '/stats', label: 'Platform Statistics', icon: BarChart3, match: (p: string) => p === '/stats' },
]
const ADMIN = [
  { href: '/admin', label: 'Students', icon: Users, match: (p: string) => p === '/admin' || p.startsWith('/admin/students') },
  { href: '/admin/team', label: 'Placement Cell Team', icon: ShieldCheck, match: (p: string) => p.startsWith('/admin/team') },
]

export function Nav({ admin }: { admin: boolean }) {
  const path = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {(admin ? ADMIN : STUDENT).map(({ href, label, icon: Icon, match }) => {
        const active = match(path)
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
