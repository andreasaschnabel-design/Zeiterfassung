import { MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_SECONDS } from "@/lib/constants";

// US-01 (Kritisch): Das Rate-Limit greift VOR dem Argon2-Aufruf. Argon2id mit
// 19 MB pro Versuch waere sonst ein DoS-Vektor.
//
// Der Store ist hier bewusst PROZESSLOKAL. US-15 (Serverless-Anpassung)
// ersetzt ihn durch Upstash Redis (instanzuebergreifend) mit prozesslokalem
// Fallback-Zaehler und 1-Sekunden-Timeout — der Schluessel bleibt
// `rl:login:<id>`. Kein Vorgriff auf US-15.

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function keyFor(identifier: string): string {
  return `rl:login:${identifier}`;
}

/**
 * True, sobald das Fenster ausgeschoepft ist. Bei MAX_LOGIN_ATTEMPTS = 5
 * laufen die Versuche 1..5 durch (und schlagen fehl), der 6. wird gesperrt.
 */
export function isRateLimited(
  identifier: string,
  now: number = Date.now(),
): boolean {
  const bucket = store.get(keyFor(identifier));
  if (!bucket || bucket.resetAt <= now) return false;
  return bucket.count >= MAX_LOGIN_ATTEMPTS;
}

/** Zaehlt einen Fehlversuch. Es zaehlen Fehlversuche, nicht Versuche. */
export function registerFailure(
  identifier: string,
  now: number = Date.now(),
): void {
  const key = keyFor(identifier);
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_SECONDS * 1000 });
    return;
  }
  bucket.count += 1;
}

/** US-15-Vorgabe vorbereitet: nach erfolgreichem Login zuruecksetzen. */
export function clearRateLimit(identifier: string): void {
  store.delete(keyFor(identifier));
}

/** Nur fuer Tests: setzt den prozesslokalen Store zurueck. */
export function __resetRateLimitStore(): void {
  store.clear();
}
