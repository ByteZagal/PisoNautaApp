import { NextRequest } from "next/server";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key?: string;
}

type Bucket = { resetAt: number; count: number };
const store = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "0.0.0.0";
  const ip = (req as unknown as { ip?: string }).ip;
  return ip ?? "0.0.0.0";
}

export function rateLimit(req: NextRequest, opts: RateLimitOptions) {
  const key = `${clientIp(req)}:${opts.key ?? "global"}`;
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    store.set(key, { resetAt, count: 1 });
    return { ok: true, remaining: opts.max - 1, resetAt };
  }

  if (bucket.count >= opts.max) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: opts.max - bucket.count, resetAt: bucket.resetAt };
}
