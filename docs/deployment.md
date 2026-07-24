# Deployment — Vercel + Supabase

## Vorbedingungen
- [ ] `npm test` vollständig grün
- [ ] US-15 umgesetzt (Puppeteer, Upstash, Prisma-URLs)
- [ ] Firmenname für `employerName` festgelegt
- [ ] Code in einem Git-Repository

---

## A — Supabase

**A1** Neues Projekt, Region `Central EU (Frankfurt)`, Plan Pro.
Datenbank-Passwort sofort sichern — wird nur einmal angezeigt.

**A2** Settings → Database → Connection string. **Zwei** URLs:
```
DATABASE_URL="postgresql://postgres.<ref>:PW@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:PW@db.<ref>.supabase.co:5432/postgres"
```
Sonderzeichen im Passwort URL-kodieren (`@` → `%40`).

**A3** Beide in `.env.local`. Prüfen, dass die Datei in `.gitignore` steht.

**A4** `npx prisma migrate deploy` (lokal, nicht im Vercel-Build).

**A5** Im SQL Editor verifizieren:
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'time_entry_employee_only';
SELECT conname FROM pg_constraint
  WHERE conrelid = '"TimeEntry"'::regclass AND contype = 'c';
SELECT indexname FROM pg_indexes WHERE tablename = 'TimeEntry';
```
Erwartet: ein Trigger, `time_format_check`, `end_after_start_check`,
Index auf `(userId, workDate)`.

**A6** Seed:
```bash
ADMIN_EMAIL="du@firma.de" ADMIN_PASSWORD="..." npm run seed
```
Legt an: Admin-Konto, `employerName`, `minimumWage`=13.90, `earningsLimit`=556.

---

## B — Upstash

**B1** Redis-Datenbank, Type Regional, Region `eu-central-1`, Eviction aus.

**B2** REST API-Reiter:
```
UPSTASH_REDIS_REST_URL="https://eu2-xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AX..."
```
Namen nicht ändern — `Redis.fromEnv()` liest genau diese.

---

## C — Vercel

**C1** Projekt aus dem Repository importieren, Framework Next.js.
Noch nicht deployen.

**C2** Environment Variables (Production + Preview + Development):
`DATABASE_URL`, `DIRECT_URL`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`.
**Kein** `ADMIN_PASSWORD` — der Seed läuft lokal.

**C3** Settings → Functions → Region `Frankfurt (fra1)`.

**C4** Build-Konfiguration prüfen:
```json
{ "scripts": { "build": "prisma generate && next build" } }
```
`prisma generate` muss im Build stehen (Vercel cached `node_modules`).
`migrate deploy` gehört **nicht** hierher.
```js
// next.config.js
experimental: {
  outputFileTracingIncludes: { "/api/export/**": ["./assets/fonts/**"] }
}
```

**C5** Deploy.

---

## D — Verifikation

| # | Prüfung | Erwartung |
|---|---|---|
| D1 | Function-Größe im Deployment-Reiter | unter 200 MB (Limit 250) |
| D2 | Login mit den Seed-Zugangsdaten | funktioniert |
| D3 | 5× falsches Passwort, dann 6. Versuch | Sperrmeldung; Upstash zeigt `rl:login`-Schlüssel |
| D4 | Mitarbeiter anlegen, 3 Einträge, 1 korrigieren, 1 löschen | keine Fehler |
| D5 | PDF-Export | **lesbarer Text**, nicht leere Kästchen |
| D5b | Dauer in den Runtime Logs | unter 20 s, sonst `maxDuration` erhöhen |
| D6 | Eintrag nach 22:00 Uhr deutscher Zeit anlegen | heutiges Datum, nicht der Vortag |

---

## E — Betrieb

**E1 Domain:** Vercel → Settings → Domains. TLS automatisch.

**E2 Monatlicher Dump** — Supabase hält 7 Tage, MiLoG verlangt 2 Jahre:
```bash
pg_dump "$DIRECT_URL" -Fc -f zeiterfassung_$(date +%Y-%m).dump
```
Verschlüsselt ablegen, zwei Jahre aufbewahren.

**E3 Restore-Test** — vor dem Echtbetrieb, nicht überspringen:
1. Zweites Supabase-Projekt (Free reicht)
2. `pg_restore -d "<TEST_URL>" zeiterfassung_YYYY-MM.dump`
3. Trigger und Constraints prüfen (SQL aus A5)
4. App lokal gegen die Testdatenbank, PDF-Export ausführen

Erst wenn das durchläuft, existiert ein Backup.

**E4 Datenschutz:** AVV mit Vercel und Supabase abschließen, beide plus
Upstash ins Verarbeitungsverzeichnis nach Art. 30 DSGVO.

---

## Häufige Fehler

| Symptom | Ursache |
|---|---|
| Build bricht mit Prisma-Fehler ab | `prisma generate` fehlt im Build-Script |
| PDF zeigt leere Kästchen | `outputFileTracingIncludes` fehlt |
| Export läuft in Timeout | `maxDuration` zu niedrig oder `runtime = "edge"` |
| Migration schlägt fehl | Pooler-URL statt Direct-URL |
| Login hängt 60 s | Upstash-Timeout greift nicht |
| Datum um einen Tag verschoben | Datumsbildung umgeht `todayISO()` |
| "Too many connections" | `connection_limit=1` fehlt |

---

## Erster Monat — worauf zu achten ist

| Beobachten | Warum |
|---|---|
| Tragen die Mitarbeiter täglich ein? | Prozessproblem, technisch nicht lösbar |
| Reicht die 31-Tage-Nachtragsfrist? | `MAX_BACKDATE_DAYS` |
| Ist die 3-Tage-Karenz zu kurz? | `EDIT_GRACE_DAYS` |
| Stimmt der PDF-Export inhaltlich? | Der eigentliche Test des Projekts |
| Warnt die Monatsgrenze zu oft? | Entscheidet, ob US-14 hilft oder stört |

**Der PDF-Test:** Den ersten Monatsnachweis mit der Frage lesen, ob man ihn
einem Prüfer der Finanzkontrolle Schwarzarbeit vorlegen würde.
