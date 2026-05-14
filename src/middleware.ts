import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Better Auth のセッショントークンcookieでログイン判定
  const sessionToken = request.cookies.get('better-auth.session_token')
  const hasSession = !!sessionToken?.value

  // Public routes
  const publicRoutes = ['/', '/auth/login', '/auth/register', '/auth/verify', '/auth/callback', '/pricing', '/s/', '/e/', '/api/auth/']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (!hasSession && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (hasSession && (pathname === '/auth/login' || pathname === '/auth/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Admin route protection はサーバーコンポーネント側で実装
  // (middlewareではD1にアクセスできないため)

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
