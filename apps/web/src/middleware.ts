import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { rateLimitFixedWindow } from "@/lib/rate-limit-edge";

/** Requests per IP per window for Better Auth API routes. */
const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX = 90;

/** POST /api/study-language — preference / progress flags. */
const STUDY_LANG_WINDOW_MS = 60_000;
const STUDY_LANG_MAX = 40;

/** POST to learn/dashboard — Server Actions (SRS, quiz, learning progress). */
const PROGRESS_WINDOW_MS = 60_000;
const PROGRESS_MAX = 300;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function rateLimitedJson(retryAfterSec: number) {
  return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSec),
    },
  });
}

function hasAuthenticatedSession(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const user = (payload as { user?: { id?: string } }).user;
  return Boolean(user?.id);
}

/**
 * Validates session via the Better Auth `/api/auth/get-session` route (cookie forwarded).
 * This avoids pulling `better-auth/cookies` (and upstream `jose`) into Edge middleware, which emits Node-only API warnings/errors.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const method = request.method;
  const ip = clientIp(request);

  if (path.startsWith("/api/auth")) {
    const bucketKey = `auth:${ip}`;
    const rl = rateLimitFixedWindow(bucketKey, AUTH_MAX, AUTH_WINDOW_MS);
    if (!rl.ok) return rateLimitedJson(rl.retryAfterSec);
    return NextResponse.next();
  }

  if (path === "/api/study-language") {
    if (method === "POST") {
      const rl = rateLimitFixedWindow(`study-lang:${ip}`, STUDY_LANG_MAX, STUDY_LANG_WINDOW_MS);
      if (!rl.ok) return rateLimitedJson(rl.retryAfterSec);
    }
    return NextResponse.next();
  }

  if (
    method === "POST" &&
    (path.startsWith("/learn") || path.startsWith("/dashboard"))
  ) {
    const rl = rateLimitFixedWindow(`progress:${ip}`, PROGRESS_MAX, PROGRESS_WINDOW_MS);
    if (!rl.ok) return rateLimitedJson(rl.retryAfterSec);
  }

  let sessionPayload: unknown = null;
  try {
    const res = await fetch(new URL("/api/auth/get-session", request.nextUrl.origin), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (res.ok) {
      sessionPayload = await res.json();
    }
  } catch {
    sessionPayload = null;
  }

  const authenticated = hasAuthenticatedSession(sessionPayload);

  const isProtected = path.startsWith("/dashboard") || path.startsWith("/learn");
  const isAuthPage = path === "/login" || path === "/register";

  if (isProtected && !authenticated) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("callbackUrl", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (isAuthPage && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/learn/:path*",
    "/login",
    "/register",
    "/api/auth/:path*",
    "/api/study-language",
  ],
};
