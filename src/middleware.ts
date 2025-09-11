import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ============================
   Rate limit (Edge-friendly)
   ============================ */

const GLOBAL_WINDOW_MS = 60_000; // 60s
const GLOBAL_MAX = 300;

type Rule = { re: RegExp; max: number; windowMs: number };

// Reglas por ruta (normalizadas quitando el prefijo "/api")
const RULES: Rule[] = [
  { re: /^\/auth\/login$/, max: 5, windowMs: 60_000 }, // patrón oficial
  { re: /^\/login$/, max: 5, windowMs: 60_000 },       // alias según nuestra ruta actual
  { re: /^\/auth\/.*/, max: 60, windowMs: 60_000 },
  { re: /^\/users\/.*/, max: 120, windowMs: 60_000 }
];

type Bucket = Map<string, number[]>; // key -> timestamps
const g = globalThis as unknown as { __RL_BUCKET?: Bucket };
const BUCKET: Bucket = g.__RL_BUCKET ?? new Map();
g.__RL_BUCKET = BUCKET;

function getIp(req: NextRequest): string {
  const maybeIp = (req as unknown as { ip?: string }).ip; // acceso tipado, sin any
  return (
    maybeIp ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

function pickRule(pathAfterApi: string): Rule {
  for (const r of RULES) if (r.re.test(pathAfterApi)) return r;
  return { re: /.*/, max: GLOBAL_MAX, windowMs: GLOBAL_WINDOW_MS };
}

function limited(key: string, rule: Rule, now = Date.now()) {
  const arr = BUCKET.get(key) ?? [];
  const recent = arr.filter((ts) => now - ts < rule.windowMs);
  const remaining = rule.max - recent.length;

  if (remaining <= 0) {
    BUCKET.set(key, recent); // purga
    const firstTs = recent.at(0) ?? now; // <-- seguro
    const resetMs = Math.max(0, rule.windowMs - (now - firstTs));
    return { blocked: true, remaining: 0, resetMs } as const;
  }

  recent.push(now);
  BUCKET.set(key, recent);
  const firstTs = recent.at(0) ?? now; // <-- seguro
  const resetMs = Math.max(0, rule.windowMs - (now - firstTs));
  return { blocked: false, remaining: rule.max - recent.length, resetMs } as const;
}

/* ============================
   Security headers + matcher
   ============================ */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path =
    url.pathname.startsWith("/api")
      ? url.pathname.slice(4) || "/"
      : url.pathname; // normaliza para reglas

  // 1) RATE LIMIT
  const ip = getIp(req);
  const rule = pickRule(path);
  const key = `${rule.re.source}:${ip}`;
  const resRate = limited(key, rule);

  if (resRate.blocked) {
    const h = new Headers({ "content-type": "application/json" });
    h.set("X-RateLimit-Limit", String(rule.max));
    h.set("X-RateLimit-Remaining", "0");
    h.set("X-RateLimit-Reset", String(Math.ceil(Date.now() / 1000 + resRate.resetMs / 1000)));
    h.set("Retry-After", String(Math.ceil(resRate.resetMs / 1000)));
    const body = JSON.stringify({ error: { code: 429, message: "Too Many Requests" } });
    return new NextResponse(body, { status: 429, headers: h });
  }

  // 2) SECURITY HEADERS
  const res = NextResponse.next();

  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // Rate headers en respuestas permitidas
  res.headers.set("X-RateLimit-Limit", String(rule.max));
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, resRate.remaining)));

  return res;
}
