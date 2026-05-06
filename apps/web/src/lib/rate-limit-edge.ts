/** Fixed-window counter — runs on Edge; isolated per runtime instance (best-effort abuse damping). */

type Bucket = { count: number; windowStart: number };

const store = new Map<string, Bucket>();

const MAX_KEYS = 5000;

function pruneStale(now: number, windowMs: number) {
  if (store.size <= MAX_KEYS) return;
  const cutoff = now - windowMs * 2;
  for (const [k, v] of store) {
    if (v.windowStart < cutoff) store.delete(k);
    if (store.size <= MAX_KEYS * 0.75) break;
  }
}

export function rateLimitFixedWindow(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 1, windowStart: now };
    store.set(key, bucket);
    pruneStale(now, windowMs);
    return { ok: true, retryAfterSec: 0 };
  }
  if (bucket.count >= limit) {
    const retryAfterMs = windowMs - (now - bucket.windowStart);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }
  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
