import { argon2id, argon2Verify } from "hash-wasm";

// US-01/AK-6: Passwoerter ausschliesslich als Argon2id-Hash.
// Parameter aus stories.md (US-01, Kritisch): memoryCost 19456 KiB,
// timeCost 2, parallelism 1.
const ARGON2_PARAMS = {
  parallelism: 1,
  iterations: 2, // timeCost
  memorySize: 19456, // KiB (~19 MB)
  hashLength: 32,
} as const;

function randomSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

/** Erzeugt einen Argon2id-PHC-String (`$argon2id$v=19$m=19456,t=2,p=1$...`). */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomSalt(),
    ...ARGON2_PARAMS,
    outputType: "encoded",
  });
}

/** Prueft ein Passwort gegen einen Argon2id-PHC-String. */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    // Unparsebarer Hash o. Ae.: als Fehlschlag werten, nicht werfen.
    return false;
  }
}

// US-01 (Kritisch): Timing-Angleichung ueber einen KONSTANTEN Dummy-Hash,
// gegen den bei unbekannter E-Mail verifiziert wird.
//
// BEWUSST als vorab berechnete Konstante, NICHT via hashPassword() erzeugt:
// hashPassword() ist ein anderer Codepfad mit anderer Laufzeit und wuerde pro
// Fehlversuch zusaetzlich 19 MB fuer einen echten Hash aufwenden. argon2Verify
// gegen diese Konstante rechnet exakt einen Verify — dieselbe Arbeit wie bei
// einem existierenden Nutzer.
export const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Tqt+JhGZrTO91CKPdg7kng$wSpv8XtTZnKLotaPZoUIPYIuLbBrOZG+rMH1qnB/Jqw";

/**
 * Verifiziert `password` gegen den Dummy-Hash. Rueckgabe absichtlich
 * verworfen — nur der Zeitverbrauch zaehlt.
 */
export async function verifyDummy(password: string): Promise<void> {
  await verifyPassword(DUMMY_HASH, password);
}
