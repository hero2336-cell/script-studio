import { NextResponse } from "next/server";
import crypto from "crypto";

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("ss_token")?.value || req.headers.get("x-ss-token");

  const expectedToken = crypto
    .createHmac("sha256", process.env.TOKEN_SECRET || "fallback-secret")
    .update(process.env.TEAM_PASSWORD + "-" + process.env.TEAM_PASSWORD)
    .digest("hex");

  if (token !== expectedToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
