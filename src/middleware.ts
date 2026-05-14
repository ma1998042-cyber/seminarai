import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth(async (req) => {
  const { nextUrl, auth: session } = req
  const { pathname } = nextUrl

  const publicRoutes = ['/', '/auth/login', '/auth/register', '/auth/verify', '/pricing', '/events']
  const isPublicRoute =
    publicRoutes.some((r) => pathname === r || pathname.startsWith(r + '/')) ||
    pathname.startsWith('/s/')

  const isAdminRoute = pathname.startsWith('/admin')

  if (!session?.user && !isPublicRoute) {
    const url = nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (session?.user && (pathname === '/auth/login' || pathname === '/auth/register')) {
    const url = nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (isAdminRoute && session?.user) {
    const { getDb, adminUsers } = await import('@/lib/db')
    const { eq } = await import('drizzle-orm')
    const db = getDb()
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, session.user.id))
      .get()

    if (!admin) {
      const url = nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
