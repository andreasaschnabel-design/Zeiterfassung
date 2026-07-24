// Zentrale Konstanten (architecture.md).
//
// Es werden nur die Konstanten aufgenommen, die von bereits umgesetzten
// Stories genutzt werden. Weitere (MAX_BACKDATE_DAYS, EDIT_GRACE_DAYS,
// WARNING_THRESHOLD) kommen mit ihren jeweiligen Stories hinzu.

/** US-01/AK-2: Sessionlaufzeit in Tagen. */
export const SESSION_DAYS = 30;

/**
 * US-01: Login-Rate-Limit. Der Zaehler greift VOR dem Argon2-Aufruf, damit
 * Argon2id (19 MB pro Versuch) kein DoS-Vektor wird. Sperre ab dem
 * (MAX_LOGIN_ATTEMPTS + 1)-ten Versuch innerhalb des Fensters.
 */
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_SECONDS = 15 * 60;
