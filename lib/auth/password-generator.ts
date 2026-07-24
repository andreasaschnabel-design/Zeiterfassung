import { WORDS } from "./wordlist";

// US-12 (Kritisch): Der Generator laeuft CLIENTSEITIG (crypto.getRandomValues),
// nicht auf dem Server. `buf[i] % WORDS.length` ist bias-frei, solange
// WORDS.length eine Zweierpotenz ist (1024 teilt 2^32 glatt). Die Wortliste
// sichert das per Test (=== 1024).

const WORD_COUNT = 4; // 4 Woerter x 10 Bit = 40 Bit
const DIGIT_MODULO = 100; // ~6,6 Bit zusaetzlich

/** Merkbares Passwort: vier Woerter und zwei Ziffern, mit "-" verbunden. */
export function generatePassword(): string {
  const buf = new Uint32Array(WORD_COUNT + 1);
  crypto.getRandomValues(buf);

  const words: string[] = [];
  for (let i = 0; i < WORD_COUNT; i++) {
    words.push(WORDS[buf[i] % WORDS.length]);
  }
  const digits = String(buf[WORD_COUNT] % DIGIT_MODULO).padStart(2, "0");

  return `${words.join("-")}-${digits}`;
}
