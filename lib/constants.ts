// Zentrale Konstanten (architecture.md).
//
// Es werden nur die Konstanten aufgenommen, die von bereits umgesetzten
// Stories genutzt werden. Weitere (MAX_BACKDATE_DAYS, EDIT_GRACE_DAYS,
// WARNING_THRESHOLD) kommen mit ihren jeweiligen Stories hinzu.

/** US-01/AK-2: Sessionlaufzeit in Tagen. */
export const SESSION_DAYS = 30;

/**
 * US-02 (via US-03): Nachtrag rueckwirkend hoechstens 31 Tage (Mitarbeiter).
 * Grosszuegiger als § 17 MiLoG (7 Tage) — bewusst, damit verspaetete Zeiten
 * ueberhaupt erfasst werden. Der Admin unterliegt dieser Grenze NICHT (US-07).
 */
export const MAX_BACKDATE_DAYS = 31;

/**
 * US-05/AK-4: Ampel gelb ab 90 %. Geteilte Schwelle fuer evaluateLimit()
 * (Minuten) und evaluateCentsLimit() (Cent, US-14) — ein Test bindet beide.
 */
export const WARNING_THRESHOLD = 0.9;

/**
 * US-04: Karenzfrist. Ein Eintrag des Vormonats bleibt fuer den Mitarbeiter
 * bis zum EDIT_GRACE_DAYS. des Folgemonats bearbeitbar. Der Admin unterliegt
 * dieser Grenze NICHT (US-07).
 */
export const EDIT_GRACE_DAYS = 3;

/**
 * US-01: Login-Rate-Limit. Der Zaehler greift VOR dem Argon2-Aufruf, damit
 * Argon2id (19 MB pro Versuch) kein DoS-Vektor wird. Sperre ab dem
 * (MAX_LOGIN_ATTEMPTS + 1)-ten Versuch innerhalb des Fensters.
 */
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_SECONDS = 15 * 60;
