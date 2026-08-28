import { NextRequest, NextResponse } from "next/server";

const adminCookie = "dimohod_admin_session";

export function middleware(request: NextRequest) {
  if (request.cookies.has(adminCookie)) return NextResponse.next();
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/customers/:path*"],
};
