import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // redirect root → /home
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(`/home`, request.url)
    );
  }

  // ข้าม static files
  if (
    pathname.startsWith('/img') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};