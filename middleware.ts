import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const legacyRedirects: Record<string, string> = {
  "/bandra-west": "/neighborhoods/bandra-west",
  "/khar-west": "/neighborhoods/khar-west",
  "/santacruz-west": "/neighborhoods/santacruz-west",
  "/bkc": "/neighborhoods/bkc",
};

export function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") || request.nextUrl.hostname || "")
    .split(":")[0]
    .toLowerCase();

  if (hostname === "app.chariotrealty.in" && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    if (origin === "https://app.chariotrealty.in") {
      const corsHeaders = new Headers({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      if (request.method === "OPTIONS") {
        return new NextResponse(null, { status: 204, headers: corsHeaders });
      }
      const response = NextResponse.next();
      corsHeaders.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  }

  const target = legacyRedirects[request.nextUrl.pathname];
  if (target) {
    return NextResponse.redirect(new URL(target, request.url), 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/bandra-west", "/khar-west", "/santacruz-west", "/bkc", "/api/:path*"],
};
