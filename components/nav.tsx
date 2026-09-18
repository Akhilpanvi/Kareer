'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Award, BarChart3, LayoutDashboard, ShieldCheck, Sparkles, UserCog, UserRound, Users } from 'lucide-react'

const STUDENT = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/dashboard' },
  { href: '/profile', label: 'Profile', icon: UserRound, match: (p: string) => p === '/profile' },
  { href: '/achievements', label: 'Skills & Achievements', icon: Award, match: (p: string) => p === '/achievements' },
  { href: '/stats', label: 'Platform Statistics', icon: BarChart3, match: (p: string) => p === '/stats' },
]
const ADMIN = [
  { href: '/admin', label: 'Students', icon: Users, match: (p: string) => p === '/admin' || p.startsWith('/admin/students') },
  { href: '/admin/shortlist', label: 'AI Shortlisting', icon: Sparkles, match: (p: string) => p.startsWith('/admin/shortlist') },
  { href: '/admin/users', label: 'Users', icon: UserCog, match: (p: string) => p.startsWith('/admin/users') },
  { href: '/admin/team', label: 'Placement Cell Team', icon: ShieldCheck, match: (p: string) => p.startsWith('/admin/team') },
  { href: '/profile', label: 'My Profile', icon: UserRound, match: (p: string) => p === '/profile' },
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
            className={`relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700 before:absolute before:inset-y-1.5 before:-left-0.5 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-brand-600 before:to-amber-500' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
