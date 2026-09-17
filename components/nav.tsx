'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Award, BarChart3, LayoutDashboard, UserRound, Users } from 'lucide-react'

const STUDENT = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/achievements', label: 'Skills & Achievements', icon: Award },
  { href: '/stats', label: 'Platform Statistics', icon: BarChart3 },
]
const ADMIN = [{ href: '/admin', label: 'Students', icon: Users }]

export function Nav({ admin }: { admin: boolean }) {
  const path = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {(admin ? ADMIN : STUDENT).map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
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
