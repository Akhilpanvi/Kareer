import { NextResponse, type NextRequest } from 'next/server'
import { cookieName, verify } from '@/lib/session'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await verify(req.cookies.get(cookieName())?.value)
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url))

  if (pathname === '/login') return session ? to(session.role === 'admin' ? '/admin' : '/dashboard') : NextResponse.next()
  if (!session) return to('/login')
  if (pathname.startsWith('/admin') && session.role !== 'admin') return to('/dashboard')
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/change-password', '/dashboard/:path*', '/profile/:path*', '/achievements/:path*', '/stats/:path*', '/admin/:path*'],
}
