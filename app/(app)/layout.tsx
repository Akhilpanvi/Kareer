import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import { Avatar, Brand } from '@/components/ui'
import { Nav } from '@/components/nav'
import { Assistant } from '@/components/assistant'
import { assistantEnabled } from '@/lib/assistant'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 lg:px-5 lg:py-5">
          <Brand />
          <form action={logout} className="lg:hidden">
            <button className="btn-ghost px-2" aria-label="Sign out"><LogOut className="size-4" /></button>
          </form>
        </div>
        <div className="px-3 pb-2 lg:flex-1 lg:pb-0">
          <Nav admin={me.role === 'admin'} />
        </div>
        <div className="hidden items-center gap-3 border-t border-zinc-100 p-4 lg:flex">
          <Link href="/profile" prefetch={false} title="Profile & password" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg hover:opacity-80">
            <Avatar name={me.name} size="size-8" />
            <div className="min-w-0 flex-1 text-sm leading-tight">
              <div className="truncate font-medium">{me.name}</div>
              <div className="truncate text-xs text-zinc-500">{me.role === 'admin' ? me.email : me.regNo}</div>
            </div>
          </Link>
          <form action={logout}>
            <button className="btn-ghost px-2" aria-label="Sign out" title="Sign out"><LogOut className="size-4" /></button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      {me.role === 'student' && assistantEnabled() && <Assistant />}
    </div>
  )
}
