import { Redis } from "@upstash/redis";
import { MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_SECONDS } from "@/lib/constants";

// US-01/US-15: Login-Rate-Limit. Der Zaehler greift VOR dem Argon2-Aufruf
// (Argon2id mit 19 MB pro Versuch waere sonst ein DoS-Vektor).
//
// US-15 (Kritisch): instanzuebergreifend via Upstash Redis. Bei Upstash-Ausfall
// greift ein PROZESSLOKALER Fallback-Zaehler — "im Zweifel sperren" waere auf
// Vercel ein Totalausfall ohne Wiederherstellungsweg. 1-Sekunden-Timeout auf
// jeden Redis-Aufruf. Schluessel bleibt `rl:login:<id>`.

const REDIS_TIMEOUT_MS = 1000;

function keyFor(identifier: string): string {
  return `rl:login:${identifier}`;
}

// --- Upstash, lazy initialisiert -------------------------------------------
let redisClient: Redis | null | undefined; // undefined = uninitialisiert

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  try {
    redisClient =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? Redis.fromEnv()
        : null;
  } catch {
    redisClient = null;
  }
  return redisClient;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("redis timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// --- Prozesslokaler Fallback-Zaehler ---------------------------------------
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function localIsRateLimited(identifier: string, now: number): boolean {
  const bucket = store.get(keyFor(identifier));
  if (!bucket || bucket.resetAt <= now) return false;
  return bucket.count >= MAX_LOGIN_ATTEMPTS;
}

function localRegisterFailure(identifier: string, now: number): void {
  const key = keyFor(identifier);
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_SECONDS * 1000 });
    return;
  }
  bucket.count += 1;
}

// --- Oeffentliche API -------------------------------------------------------

/**
 * True, sobald das Fenster ausgeschoepft ist. Bei MAX_LOGIN_ATTEMPTS = 5 laufen
 * die Versuche 1..5 durch (und schlagen fehl), der 6. wird gesperrt.
 */
export async function isRateLimited(
  identifier: string,
  now: number = Date.now(),
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const count = await withTimeout(
        redis.get<number>(keyFor(identifier)),
        REDIS_TIMEOUT_MS,
      );
      return (count ?? 0) >= MAX_LOGIN_ATTEMPTS;
    } catch {
      // Ausfall → Fallback, NICHT totalsperren.
    }
  }
  return localIsRateLimited(identifier, now);
}

/** Zaehlt einen Fehlversuch. Es zaehlen Fehlversuche, nicht Versuche. */
export async function registerFailure(
  identifier: string,
  now: number = Date.now(),
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      const key = keyFor(identifier);
      const count = await withTimeout(redis.incr(key), REDIS_TIMEOUT_MS);
      if (count === 1) {
        await withTimeout(
          redis.expire(key, LOGIN_WINDOW_SECONDS),
          REDIS_TIMEOUT_MS,
        );
      }
      return;
    } catch {
      // Fallback.
    }
  }
  localRegisterFailure(identifier, now);
}

/** US-15: nach erfolgreichem Login zuruecksetzen (Fehlversuche zaehlen). */
export async function clearRateLimit(identifier: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await withTimeout(redis.del(keyFor(identifier)), REDIS_TIMEOUT_MS);
      return;
    } catch {
      // Fallback.
    }
  }
  store.delete(keyFor(identifier));
}

/** Nur fuer Tests: setzt den prozesslokalen Store zurueck. */
export function __resetRateLimitStore(): void {
  store.clear();
  redisClient = undefined;
}
