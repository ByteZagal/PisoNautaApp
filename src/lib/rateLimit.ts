type Hit = { count: number; reset: number };
const bucket = new Map<string, Hit>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const hit = bucket.get(key);
  if (!hit || hit.reset < now) {
    bucket.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, reset: new Date(now + windowMs) };
  }
  if (hit.count >= limit) return { ok: false, remaining: 0, reset: new Date(hit.reset) };
  hit.count++;
  return { ok: true, remaining: limit - hit.count, reset: new Date(hit.reset) };
}
