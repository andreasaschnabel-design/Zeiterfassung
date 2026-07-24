# Minijob-Zeiterfassung

Webbasierte Arbeitszeiterfassung für 3 Minijobber nach § 17 MiLoG.
Mitarbeiter erfassen Zeiten mobil, der Arbeitgeber kontrolliert, korrigiert und
exportiert prüffeste Monatsnachweise.

## Arbeitsweise

Dieses Projekt ist **vollständig spezifiziert**, bevor Code entsteht.
Die Spezifikation liegt in `docs/`. Sie ist verbindlich, nicht beispielhaft.

**Vor jeder Implementierung:**
1. `docs/architecture.md` lesen — Designentscheidungen DE-01 bis DE-07
2. Die Story-Datei in `docs/stories/` lesen
3. Die Übergabenotizen am Ende der vorherigen Stories beachten

**Regeln:**
- Eine Story pro Arbeitsschritt. Kein Vorgriff auf spätere Stories.
- Akzeptanzkriterien sind die Vorgabe. Jede AK muss nachweisbar erfüllt sein.
- Codekommentare mit "BEWUSST NICHT GELÖST" oder "NICHT ... nachtragen"
  dokumentieren getroffene Entscheidungen. Nicht ohne Rückfrage ändern.
- Tests liegen bei den Funktionen, die sie prüfen. `/lib/time` und `/lib/money`
  brauchen vollständige Abdeckung.

## Tech-Stack

| Ebene | Wahl |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| DB | PostgreSQL (Supabase, Region Frankfurt) |
| ORM | Prisma mit `directUrl` für Migrationen |
| Auth | Eigene Implementierung: opaque Sessions, Argon2id |
| UI | Tailwind + shadcn/ui |
| PDF | puppeteer-core + @sparticuz/chromium |
| Rate-Limit | Upstash Redis |
| Hosting | Vercel (Region fra1), Serverless |

## Kernkonzepte

**Zeit:** Alle Dauern intern in Minuten (Integer). `workDate` ist ein reines
Datum ohne Zeitzone. Uhrzeiten sind lokale Wanduhrzeit als `HH:MM`-String.
Kein UTC-Umrechnen. Details: DE-02, DE-03 in `architecture.md`.

**Geld:** Alle Beträge in Cent (Integer). Niemals `Number(Decimal)` in
Geldrechnungen. Rundung genau einmal, am Ende. Siehe `/lib/money.ts`.

**Soft-Delete:** `TimeEntry` wird nie physisch gelöscht (2 Jahre
Aufbewahrungspflicht). Die Prisma-Middleware erzwingt `deletedAt: null`.
Siehe DE-04.

**Warnen statt blockieren:** Das System zeigt Zahlen und warnt, trifft aber
keine sozialversicherungs- oder arbeitsrechtlichen Bewertungen. Gilt für
Mindestlohn, Entgeltgrenze, ArbZG-Pausen.

## Rollen

- `EMPLOYEE` — erfasst und sieht nur eigene Zeiten
- `ADMIN` — sieht alle, korrigiert alle, exportiert, verwaltet Stammdaten

Zeiteinträge gehören ausschließlich zu EMPLOYEE-Konten (DB-Trigger).

## Umsetzungsreihenfolge

Stories in dieser Reihenfolge, nicht anders — jede baut auf Vorgängern auf:

```
US-01  Auth + Rollen
US-10  Mitarbeiter anlegen
US-02  Zeiteintrag anlegen        (Kern: /lib/time)
US-05  Monatsübersicht + Limit
US-04  Eintrag korrigieren        (Audit-Zyklus)
US-06  Admin-Dashboard
US-07  Admin-Korrektur
US-08  PDF-Export
US-09  CSV-Export
US-03  Nachtrag                   (bereits durch US-02 abgedeckt, nur verifizieren)
US-12  Passwort zurücksetzen
US-11  Änderungsprotokoll
US-14  Jahressumme
US-15  Serverless-Anpassung       (vor dem Deployment)
US-13  Stammdaten-Audit           (optional, Priorität Kann)
```

## Verzeichnisstruktur

```
/app
  /(auth)/login
  /dashboard                    Mitarbeiter: Eingabe + Monatsansicht
  /admin
    /overview                   alle Mitarbeiter, Monatsstunden
    /employees                  Stammdaten
    /employees/[id]             Detail + Korrektur
    /entries/[id]/history       Änderungsprotokoll
    /export
    /settings
  /api/export/pdf/[userId]/[month]
  /api/export/csv/[month]
/lib
  /auth                         Sessions, Guards, Passwörter, Rate-Limit
  /time                         Dauerberechnung, Überschneidung, Datum, Limit
  /money                        Cent-Arithmetik
  /queries                      Datenzugriff
  /audit                        Diff, Labels
  /export                       PDF-Vorlage, CSV, Dateinamen
  /validation                   Zod-Schemata
/assets/fonts                   DejaVuSans.ttf, DejaVuSans-Bold.ttf
/prisma                         schema.prisma, migrations
```

## Was NICHT gebaut wird

- Self-Service-Passwort-Reset per E-Mail (kein Mailversand im Projekt)
- Erzwungener Passwortwechsel beim ersten Login
- Lexware-/DATEV-Schnittstelle
- Urlaubs-, Krankheits- oder Schichtverwaltung
- GPS- oder Standortprüfung
- Lohnabrechnung (der Bruttobetrag im PDF ist "nachrichtlich")
- Live-Stempeluhr
