import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SSO_BASE_URL } from "@/lib/sso";

export function proxy(request: NextRequest) {
  const hasToken = Boolean(request.cookies.get("access_token")?.value);

  if (hasToken) return NextResponse.next();

  // No SSO cookie: send the user to the identity portal. Carry the current
  // address so the portal can return them to the same page after login.
  const loginUrl = new URL("/", SSO_BASE_URL);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.origin}${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: "/labs/:path*",
};
