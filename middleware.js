import { NextResponse } from "next/server";

// 로그인 없이 접근 허용할 경로
const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"];

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 토큰 확인 (쿠키 또는 헤더)
  const token = req.cookies.get("ss_token")?.value || req.headers.get("x-ss-token");

  const secret = process.env.TOKEN_SECRET || "fallback-secret";
  const password = process.env.TEAM_PASSWORD || "";
  const expectedToken = await hmacSha256(secret, password + "-" + password);

  if (token !== expectedToken) {
    // API 요청이면 401 반환
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // 페이지 요청이면 로그인으로 리다이렉트
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
