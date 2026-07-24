# Architektur

Version 2.0 (Vercel + Supabase). Ersetzt v1.1 (Hetzner + Docker).

## Leitentscheidung

3 Nutzer, ~60 Zeiteinträge im Monat, kein Realtime-Bedarf. Die Architektur ist
auf **wartungsarm und datensicher** optimiert, nicht auf Skalierung. Jede
Komplexität, die sich nicht aus einer Anforderung ableitet, entfällt.

## Datenmodell

```prisma
enum Role { ADMIN EMPLOYEE }
enum AuditAction { CREATE UPDATE DELETE }
enum SecurityAction { PASSWORD_RESET EMPLOYEE_ACTIVATED EMPLOYEE_DEACTIVATED }

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String
  name              String
  role              Role     @default(EMPLOYEE)
  hourlyRate        Decimal  @db.Decimal(5,2) @default(13.90)
  monthlyLimitHours Decimal  @db.Decimal(5,2) @default(40)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())

  sessions          Session[]
  timeEntries       TimeEntry[]
  auditLogs         AuditLog[]         @relation("AuditActor")
  securityAsTarget  SecurityLog[]      @relation("SecurityLogTarget")
  securityAsActor   SecurityLog[]      @relation("SecurityLogActor")
}

model Session {
  id        String   @id            // sha256(token), nie der Token selbst
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model TimeEntry {
  id              String    @id @default(cuid())
  userId          String
  workDate        DateTime  @db.Date
  startTime       String                      // "HH:MM"
  endTime         String                      // "HH:MM"
  breakMinutes    Int
  durationMinutes Int                         // persistiert, DE-01
  note            String?
  deletedAt       DateTime?                   // Soft-Delete, DE-04
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdById     String

  user      User       @relation(fields: [userId], references: [id])
  auditLogs AuditLog[]

  @@index([userId, workDate])
  @@index([deletedAt])
}

model AuditLog {
  id           String      @id @default(cuid())
  timeEntryId  String
  changedById  String
  action       AuditAction
  oldValues    Json?
  newValues    Json?
  changedAt    DateTime    @default(now())

  timeEntry TimeEntry @relation(fields: [timeEntryId], references: [id])
  changedBy User      @relation("AuditActor", fields: [changedById], references: [id])
  @@index([timeEntryId, changedAt])
}

model SecurityLog {
  id           String         @id @default(cuid())
  action       SecurityAction
  targetUserId String
  actorId      String
  details      Json?
  occurredAt   DateTime       @default(now())

  targetUser User @relation("SecurityLogTarget", fields: [targetUserId], references: [id])
  actor      User @relation("SecurityLogActor",  fields: [actorId],      references: [id])
  @@index([targetUserId, occurredAt])
}

model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

**Setting-Schlüssel:** `minimumWage` (13.90), `earningsLimit` (556),
`employerName` (Firmenname, ohne den kein Export)

## Designentscheidungen

### DE-01 — Dauer persistiert, nicht nur berechnet
`durationMinutes` wird beim Speichern geschrieben. Monatssummen werden
aggregiert, nicht neu berechnet. Eine historische Aufzeichnung darf sich nicht
ändern, wenn sich später die Berechnungsformel ändert.

### DE-02 — Zeit ohne Zeitzone
`workDate` als `@db.Date`, `startTime`/`endTime` als `HH:MM`-String.
Arbeitszeiterfassung ist lokale Wanduhrzeit — UTC-Umrechnung erzeugt bei
Sommerzeitwechseln nur Fehler.

**Kritisch:** `new Date(isoString)` erzeugt UTC-Mitternacht und ist damit
je nach Serverzeitzone der falsche Tag. Ausschließlich `isoDateToDbDate()`
und `dbDateToIso()` verwenden. Eine ESLint-Regel erzwingt das.

Auf Vercel läuft die Systemzeit in UTC. `todayISO()` nutzt
`Intl.DateTimeFormat` mit `timeZone: "Europe/Berlin"` — jede Datumsbildung
läuft darüber.

### DE-03 — Minuten als Basiseinheit
Alle Dauern intern in Minuten (Integer). Dezimalstunden nur an der Oberfläche.
Verhindert Rundungsdrift.

Analog für Geld: alle Beträge in Cent (Integer). `grossPay(minutes, rateCents)`
rechnet `minutes * rateCents / 60` und rundet genau einmal.

### DE-04 — Soft-Delete durchgängig
Kein Query auf `TimeEntry` ohne `deletedAt IS NULL`. Erzwungen über
Prisma-Middleware, nicht über Disziplin:

```ts
db.$use(async (params, next) => {
  if (params.model !== "TimeEntry") return next(params);
  if (["findMany","findFirst","findFirstOrThrow","count","aggregate","groupBy"]
      .includes(params.action)) {
    params.args = params.args ?? {};
    params.args.where = { ...params.args.where, deletedAt: null };
  }
  return next(params);
});
```

`deletedAt: null` steht **nach** dem Spread — nicht überschreibbar.
`findUnique` ist ausgenommen: Guards müssen "gelöscht" von "existiert nicht"
unterscheiden können. Zugriff auf gelöschte Listen nur über
`getDeletedEntries()` mit `$queryRaw`.

### DE-05 — Audit im selben Transaktionsblock
Schreibvorgang und Protokolleintrag atomar. Sonst entstehen Lücken genau dann,
wenn es darauf ankommt.

### DE-06 — Autorisierung serverseitig, ressourcenbezogen
Jeder Zugriff prüft `entry.userId === session.userId || role === ADMIN`.
Middleware prüft nur Cookie-Existenz (Edge-Runtime, kein DB-Zugriff); die
echte Prüfung passiert in jedem Route-Einstieg.

### DE-07 — Keine Mitternachtsüberschreitung
`endTime > startTime` ist Invariante. Validiert in `/lib/time` **und** als
DB-Check-Constraint. Ein Eintrag gehört immer zu genau einem Kalendertag.

## DB-Constraints und Trigger

```sql
ALTER TABLE "TimeEntry"
  ADD CONSTRAINT time_format_check
  CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     AND "endTime"   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT end_after_start_check
  CHECK ("endTime" > "startTime");

CREATE OR REPLACE FUNCTION check_entry_user_is_employee() RETURNS trigger AS $$
BEGIN
  IF (SELECT role FROM "User" WHERE id = NEW."userId") <> 'EMPLOYEE' THEN
    RAISE EXCEPTION 'TimeEntry.userId muss auf ein EMPLOYEE-Konto zeigen (ist: %)',
      (SELECT role FROM "User" WHERE id = NEW."userId");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entry_employee_only
  BEFORE INSERT OR UPDATE OF "userId" ON "TimeEntry"
  FOR EACH ROW EXECUTE FUNCTION check_entry_user_is_employee();
```

## Zentrale Funktionen

Diese Funktionen sind die **einzigen** Einstiege für ihren Zweck.
Keine Parallelimplementierungen.

| Funktion | Ort | Zweck |
|---|---|---|
| `requireUser()` | `/lib/auth/guard` | Jede geschützte Route |
| `requireAdmin()` | `/lib/auth/guard` | Admin-Routen und -Actions |
| `requireEmployeeTarget(id)` | `/lib/auth/guard` | Admin-Zugriff auf Mitarbeiter |
| `requireOwnEditableEntry(id)` | `/lib/auth/guard` | Mitarbeiter-Bearbeitung |
| `requireAdminEntryAccess(id)` | `/lib/auth/guard` | Admin-Bearbeitung, ohne Karenzprüfung |
| `calculateDuration()` | `/lib/time/core` | Einzige Quelle für `durationMinutes` |
| `findDayConflict()` | `/lib/queries/overlap` | Überschneidungsprüfung, CREATE und UPDATE |
| `isoDateToDbDate()` / `dbDateToIso()` | `/lib/time/dates` | Jede `workDate`-Konvertierung |
| `monthRange()` | `/lib/time/dates` | Halboffen `[gte, lt)` |
| `isEmployeeEditable()` | `/lib/time/dates` | Karenzfrist, nur für Mitarbeiter |
| `evaluateLimit()` | `/lib/time/limit` | Ampelstatus, Minuten |
| `evaluateCentsLimit()` | `/lib/time/limit` | Ampelstatus, Cent — geteilte Schwelle |
| `getMonth(userId, ym)` | `/lib/queries/month` | Jede Monatsabfrage |
| `getAdminMonthOverview(ym)` | `/lib/queries/admin-month` | Mehr-Mitarbeiter-Aggregation |
| `grossPay()` | `/lib/money` | Jede Geldrechnung |
| `diffEntry()` | `/lib/audit/diff` | Audit-Diff, `null` bei Nulländerung |

## Konstanten

```ts
MAX_BACKDATE_DAYS = 31      // Nachtrag rückwirkend (Mitarbeiter)
EDIT_GRACE_DAYS   = 3       // Bearbeitung im Vormonat bis zum 3.
WARNING_THRESHOLD = 0.9     // Ampel gelb ab 90 %
SESSION_DAYS      = 30
```

Der Admin unterliegt weder `MAX_BACKDATE_DAYS` noch `EDIT_GRACE_DAYS` —
er ist der Eskalationsweg.

## Bewusst nicht gelöste Probleme

Diese Entscheidungen stehen als Codekommentare an der jeweiligen Stelle.
**Nicht ohne neue Abwägung ändern.**

**Race Condition bei Überschneidungsprüfung** (US-02)
Zwischen Prüfung und INSERT liegt ein Fenster. Nicht gelöst, weil der
Fehlerfall sichtbar (zwei Einträge in der Liste) und korrigierbar ist.
Lösung falls nötig: EXCLUDE-Constraint mit `tstzrange` + `btree_gist`.
**Nicht** Vorab-Lock, **nicht** Retry-Loop.

**Kein optimistisches Sperren** (US-04)
Bei paralleler Änderung gewinnt der letzte Schreibvorgang. Der überschriebene
Wert ist im AuditLog erhalten, also nicht verloren.
Lösung falls nötig: `version`-Feld + `where: { id, version }`.

**Duplikation `updateTimeEntry` / `adminUpdateTimeEntry`** (US-06+07)
Unterscheiden sich in drei sicherheitsrelevanten Zeilen: Guard,
`userId`-Quelle, `changedById`. Ein `if (isAdmin)` in der Berechtigungslogik
wäre schwerer zu prüfen. Rechenlogik ist geteilt.

**Kein Rate-Limit auf Exportrouten** (US-08)
Anders als `/login`: authentifiziert. Ein Admin, der sein System per
Export-Spam lahmlegt, kann es auch über die Konsole.

**Kein erzwungener Passwortwechsel** (US-12)
Der Admin gibt das Passwort mündlich weiter und kennt es ohnehin.

**Kalenderjahr statt Zeitjahr** (US-14)
Die Minijob-Grenze gilt im rollierenden Zeitjahr ab Beschäftigungsbeginn.
Das System zeigt das Kalenderjahr mit Hinweis, statt eine anteilige Grenze
zu erfinden, die im Gesetz nicht steht.

## Serverless-Besonderheiten (v2.0)

**Prisma:** `directUrl` für Migrationen, Pooler mit `connection_limit=1` zur
Laufzeit. Client als globalThis-Singleton, Middleware nur einmal registrieren.

**PDF:** `puppeteer-core` + `@sparticuz/chromium`. **Kein** Browser-Singleton —
Function-Instanzen sind isoliert. Schriften als Base64 eingebettet, nicht per
CDN. `outputFileTracingIncludes` in `next.config.js`, sonst fehlen sie in
Produktion. `document.fonts.ready` abwarten.

**Rate-Limit:** Upstash Redis. Bei Ausfall greift ein prozesslokaler
Notfall-Zähler — "im Zweifel sperren" wäre auf Vercel ein Totalausfall ohne
Wiederherstellungsweg.

**Zeitzone:** Vercel läuft in UTC. Alle Datumsbildung über `todayISO()`.
