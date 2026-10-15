import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const legacyRedirects: Record<string, string> = {
  "/bandra-west": "/neighborhoods/bandra-west",
  "/khar-west": "/neighborhoods/khar-west",
  "/santacruz-west": "/neighborhoods/santacruz-west",
  "/bkc": "/neighborhoods/bkc",
};

export function middleware(request: NextRequest) {
  const { hostname } = request.nextUrl;
  if (hostname === "app.chariotrealty.in" && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  const target = legacyRedirects[request.nextUrl.pathname];
  if (target) {
    return NextResponse.redirect(new URL(target, request.url), 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/bandra-west", "/khar-west", "/santacruz-west", "/bkc"],
};
