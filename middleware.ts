import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  const origin = request.headers.get("origin");
  const isChariotAdmin = origin === "https://app.chariotrealty.in";

  if (isChariotAdmin && request.nextUrl.pathname.startsWith("/api/")) {
    const corsHeaders = new Headers({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
    if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: corsHeaders });
    const response = NextResponse.next();
    corsHeaders.forEach((value, key) => response.headers.set(key, value));
    return response;
  }

  if (host === "app.chariotrealty.in" && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/api/:path*"] };
