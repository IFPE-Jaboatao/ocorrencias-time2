import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PREFIXES = ['/login', '/auth/', '/ciencia/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
  const hasCookie = request.cookies.has('sgoa_token');

  // Rota protegida sem cookie → login
  if (!isPublic && !hasCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Login com cookie válido → dashboard
  if (pathname === '/login' && hasCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclui arquivos estáticos, imagens e favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
