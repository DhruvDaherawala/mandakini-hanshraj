import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Navigation hint only. Server layouts and every API operation verify the session.
  if (path === '/admin' || path === '/admin/login' || request.cookies.has('riwayat_session')) return NextResponse.next();
  const url = request.nextUrl.clone(); url.pathname = '/admin'; url.search = '';
  const response = NextResponse.redirect(url); response.headers.set('Cache-Control', 'no-store'); return response;
}
export const config = { matcher: ['/admin/:path*'] };

