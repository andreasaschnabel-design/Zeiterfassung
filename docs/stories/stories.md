# Stories

Alle Stories sind spezifiziert und wurden gegen ihre Akzeptanzkriterien
geprüft. Die Hinweise unter "Kritisch" stammen aus Code-Reviews — es sind
Fehler, die beim ersten Umsetzungsversuch tatsächlich aufgetreten sind.

---

## US-01 — Anmeldung

**Als Mitarbeiter melde ich mich an, damit nur ich meine Zeiten sehe.**

- AK-1 Login mit E-Mail + Passwort; generische Fehlermeldung ohne Hinweis, welches Feld falsch war
- AK-2 Session 30 Tage, kein tägliches Neuanmelden
- AK-3 Nicht angemeldeter Zugriff auf geschützte Routen → Redirect `/login`
- AK-4 Rolle in der Session; `/admin/*` nur mit ADMIN
- AK-5 Inaktive Nutzer können sich nicht anmelden
- AK-6 Passwörter nur als Argon2id-Hash
- AK-7 Logout beendet die Session

**Kritisch:**
- Session-Token wird **gehasht** gespeichert (`sha256(token)` als `Session.id`),
  nie im Klartext. Ein DB-Leak gibt dann keine gültigen Sessions her.
- `isActive` wird **in `validateSession`** geprüft, nicht nur beim Login —
  ein deaktivierter Mitarbeiter fliegt sofort raus, nicht erst in 30 Tagen.
- Timing-Angleichung über einen **konstanten Dummy-Hash**, gegen den bei
  unbekannter E-Mail verifiziert wird. Nicht `hashPassword()` aufrufen —
  anderer Codepfad, andere Laufzeit, 19 MB Speicher pro Fehlversuch.
- Rate-Limit greift **vor** dem Argon2-Aufruf. Argon2 mit 19 MB pro Versuch
  ist sonst ein DoS-Vektor.
- Alte Session vor jedem neuen Login invalidieren (Session-Fixation).
- Session-Verlängerung höchstens einmal täglich, nicht bei jedem Request.
- Argon2-Parameter: `memoryCost: 19456, timeCost: 2, parallelism: 1`

**Übergabe:** `requireUser()` / `requireAdmin()` sind ab jetzt die
verbindlichen Einstiegspunkte jeder geschützten Route.

---

## US-10 — Mitarbeiter anlegen

**Als Admin lege ich Mitarbeiter an und setze deren Limit.**

- AK-1 Liste aller Mitarbeiter (Name, E-Mail, Satz, Limit, Status)
- AK-2 Anlegen mit Name, E-Mail, Stundensatz, Monatslimit, Initialpasswort
- AK-3 E-Mail eindeutig, Duplikat abgelehnt
- AK-4 Stammdaten bearbeitbar
- AK-5 Deaktivieren statt Löschen (Zeiteinträge bleiben erhalten)
- AK-6 Globale Parameter pflegen (`minimumWage`, `earningsLimit`, `employerName`)
- AK-7 Nur mit `requireAdmin()`

**Kritisch:**
- AK-3 über den **DB-Unique-Constraint**, nicht über Vorab-`findUnique`.
  Ein Vorab-Check ist eine Race Condition.
- **Kein `role`-Feld im Formular.** Angelegt wird immer EMPLOYEE.
- `requireEmployeeTarget(id)` lädt und prüft in einem Schritt — Admin-Konten
  sind über Mitarbeiter-Verwaltungspfade nicht adressierbar. Gilt für
  **alle** Actions, auch `setEmployeeActive`.
- Deaktivierung löscht Sessions **in derselben Transaktion**.
- Mindestlohn- und Grenzwertprüfung **warnen**, blockieren nicht.
  Serverseitig ausführen, nicht nur im Client.
- Limit-Vorschlag beim Anlegen: `earningsLimit / hourlyRate`, abgerundet
  (556 / 13,90 = 40,0).
- Passwortfeld: `autoComplete="new-password"`, `data-1p-ignore`,
  `data-lpignore="true"` — der Browser soll das Mitarbeiterpasswort nicht
  unter dem Admin-Profil speichern.
- Mindestlohnänderung wirkt **nicht rückwirkend** auf `hourlyRate`.
- Wiederherstellungsweg gegen Aussperrung: `npm run admin:reset` über die
  Konsole, setzt Passwort und `isActive` per Umgebungsvariable.

---

## US-02 — Zeiteintrag anlegen

**Als Mitarbeiter trage ich meine Arbeitszeit für heute ein.**

- AK-1 Formular: Datum (Vorbelegung heute), Beginn, Ende, Pause, optionale Notiz
- AK-2 Dauer = (Ende − Beginn) − Pause, berechnet und persistiert
- AK-3 Ende ≤ Beginn abgelehnt
- AK-4 Pause ≥ Bruttoarbeitszeit abgelehnt
- AK-5 Überschneidung am selben Tag abgelehnt
- AK-6 Zukunftsdatum abgelehnt
- AK-7 Eintrag erscheint sofort in der Monatsliste
- AK-8 Eintrag gehört immer dem angemeldeten Nutzer
- AK-9 Erfassung auf dem Handy in unter 20 Sekunden

**Kritisch:**
- **`isoDateToDbDate()` verwenden**, niemals `new Date(iso)`. Letzteres
  erzeugt UTC-Mitternacht und speichert je nach Zeitzone den Vortag.
  Betrifft Schreiben **und** die `where`-Klausel der Überschneidungsprüfung.
- **Halboffene Intervalle** bei der Überschneidung: `a.start < b.end && b.start < a.end`.
  09:00–13:00 und 13:00–17:00 schließen lückenlos an, sind kein Konflikt.
- Bereichsprüfung der Uhrzeit ins **Zod-Schema** (`.refine`), nicht per
  Non-Null-Assertion. `"99:99"` ist regexkonform, aber ungültig.
- DB-Werte, die nicht parsebar sind: **laut scheitern**, nicht still `NaN`.
  Ein `NaN`-Vergleich liefert immer `false` — die Überschneidungsprüfung
  fände schweigend nichts.
- `userId` kommt aus der Session, es gibt **kein Formularfeld** dafür.
- Überschneidungsabfrage mit `deletedAt: null` (kommt aus der Middleware).
- ArbZG-Pausenhinweise (§4: 30 Min ab 6 Std, 45 Min ab 9 Std) und
  §3-Hinweis (>10 Std) als **Warnung**, nicht als Ablehnung.
- Audit-CREATE im selben `$transaction`-Block.

**UI (NFR-01):** `type="date"` und `type="time"` für native Picker,
Pause als Chips (0/15/30/45), Notiz eingeklappt, Live-Dauer unter dem
Formular, Button 48px. Ziel: 4 Taps.

**Übergabe:** `findDayConflict()` in US-04 mit `excludeEntryId` aufrufen —
sonst überschneidet sich jeder Eintrag mit sich selbst.

---

## US-05 — Monatsübersicht

**Als Mitarbeiter sehe ich meine Monatssumme und wie nah ich am Limit bin.**

- AK-1 Liste aller Einträge des Monats, chronologisch
- AK-2 Monatssumme in Dezimalstunden
- AK-3 Fortschrittsanzeige gegen `monthlyLimitHours`
- AK-4 Ab 90 % gelb, ab 100 % rot
- AK-5 Monatsnavigation vor/zurück
- AK-6 Nur eigene Einträge
- AK-7 Leerer Monat mit verständlichem Hinweis

**Kritisch:**
- **Eine Abfrage**, Summe aus der geladenen Liste (`reduce`). Zwei getrennte
  Abfragen (Liste + Aggregat) können auseinanderlaufen — die Summe muss aus
  dem Sichtbaren nachrechenbar sein.
- `monthRange()` halboffen `[gte, lt)`. `Date.UTC(year, 12, 1)` rollt korrekt
  ins Folgejahr, kein Dezember-Sonderfall.
- `limitMinutes <= 0` abfangen (Division durch null).
- Prozentzahl **nicht** kappen, Balkenbreite schon.
- Navigation: vorwärts bis zum aktuellen Monat, rückwärts bis `user.createdAt`.
  Bereichsprüfung auch für den URL-Parameter, nicht nur die Pfeile.
- Pfeile **deaktivieren**, nicht verstecken (Layout-Sprung).
- Leerzustand kontextabhängig: im aktuellen Monat Handlungsaufforderung,
  in älteren nur "Keine Zeiten erfasst" — der Nachtrag ist dort gesperrt.
- Ampelfarbe trägt die Information **nicht allein**: Statustext bei WARNING
  und EXCEEDED immer sichtbar, `role="progressbar"` mit ARIA-Werten.

---

## US-04 — Eintrag korrigieren

**Als Mitarbeiter korrigiere ich einen falschen Eintrag.**

- AK-1 Eigene Einträge des laufenden Monats bearbeitbar
- AK-2 Ältere gesperrt (nur Admin)
- AK-3 Bearbeitbar: Beginn, Ende, Pause, Notiz. **Datum nicht**
- AK-4 Gleiche Validierung wie US-02
- AK-5 Überschneidungsprüfung schließt den bearbeiteten Eintrag aus
- AK-6 `durationMinutes` neu berechnet
- AK-7 Jede Änderung erzeugt AuditLog mit Alt/Neu, atomar
- AK-8 Löschen ist Soft-Delete
- AK-9 Fremde Einträge nicht adressierbar

**Kritisch:**
- **Unterschiedliche Fehlerbehandlung:** AK-9 → `notFound()` (Existenz
  verschleiern), AK-2 → sprechende Meldung (der Nutzer sieht den Eintrag ja).
- Guard gibt ein **Ergebnisobjekt** zurück, wirft nicht — sonst landet die
  Meldung in der Next.js-Fehlerseite statt im Formular.
- **DELETE protokolliert den Vollzustand**, nicht nur einen Diff. Nach dem
  Löschen ist der Eintrag aus jeder Liste verschwunden.
- `diffEntry()` gibt `null` bei Nulländerung — kein Protokollrauschen.
- Karenzfrist `isEmployeeEditable()`: laufender Monat plus bis zum 3. des
  Folgemonats. `shiftMonth()` für den Jahreswechsel verwenden, nicht `month - 1`.
- Funktionssignatur mit `now = new Date()`-Default, damit testbar ohne
  Systemzeit-Manipulation.
- Formularhinweis, wenn ein rückdatierter Eintrag nach dem Anlegen sofort
  nicht mehr editierbar wäre.

---

## US-06 + US-07 — Admin-Dashboard und -Korrektur

**Als Admin sehe ich alle Mitarbeiter mit Monatsstunden / korrigiere Einträge.**

US-06:
- AK-1 Übersicht mit Monatssumme, Limitstatus, Anzahl Einträge
- AK-2 Gleiche Schwellen wie US-05
- AK-3 Monatsnavigation
- AK-4 Absprung in die Detailansicht
- AK-5 Inaktive mit Einträgen im Zeitraum bleiben sichtbar
- AK-6 Nur mit `requireAdmin()`

US-07:
- AK-7 Jeder Eintrag jedes Mitarbeiters, **ohne** Monatsbeschränkung
- AK-8 Gleiche Validierung
- AK-9 Überschneidungsprüfung gegen den **betroffenen Mitarbeiter**
- AK-10 Audit mit `changedById = admin.id`
- AK-11 Admin kann löschen
- AK-12 Admin kann anlegen, ohne `MAX_BACKDATE_DAYS`

**Kritisch:**
- `groupBy` braucht denselben **Rollenfilter** wie die `users`-Abfrage
  (`user: { role: "EMPLOYEE" }`). Sonst enthält die Aggregation Einträge,
  die in keiner Zeile erscheinen.
- **AK-9 ist der häufigste Fehler:** `findDayConflict(entry.userId, ...)`,
  nicht `admin.id`.
- `requireAdminEntryAccess()` prüft `isEmployeeEditable` **bewusst nicht** —
  der Admin ist der Eskalationsweg. Kommentar dazu in den Code.
- AK-5 über `entryCount > 0`, nicht über ein Austrittsdatum.
- `createdById` bekommt hier seinen Zweck: Bei Admin-Anlage ist
  `createdById !== userId`.
- Leerzustände getrennt: "keine Mitarbeiter angelegt" (mit Link zum Anlegen)
  vs. "keine Zeiten in diesem Monat".
- Kenntlichmachung in der Mitarbeiterliste, wenn der Admin einen Eintrag
  geändert hat.

---

## US-08 + US-09 — PDF- und CSV-Export

**Als Admin exportiere ich den Monatsnachweis als PDF / CSV.**

- AK-1 PDF mit Name, Zeitraum, Einzeltagen, Summe, Erstellungszeitpunkt
- AK-2 Ein Prüfer muss § 17 MiLoG daraus erfüllt sehen
- AK-3 Sammel-Export aller Mitarbeiter
- AK-4 Nur mit `requireAdmin()`
- AK-5 CSV je Mitarbeiter und Monat
- AK-6 Sammel-CSV
- AK-7 Deutsche Konventionen, Excel-kompatibel

**Kritisch:**
- **Geld in Cent:** `grossPay(minutes, rateCents)` = `minutes * rateCents / 60`,
  eine Rundung am Ende. Niemals über Dezimalstunden.
- **Dateiname:** Transliteration **vor** NFD-Zerlegung. `ß` ist kein
  Kombinationszeichen — NFD zerlegt es nicht, die Filterung löscht es
  ersatzlos, und "Weiß" wird zu "Wei". `ä → ae`, nicht `a`.
  Fallback `|| "Unbekannt"`, falls nichts übrig bleibt.
- **CSV:** BOM (`\uFEFF`), Semikolon, CRLF, Dezimalkomma. Doppelte Dauerspalte
  (Dezimalstunden zum Ablesen, Minuten als Integer zur Weiterverarbeitung).
  **Keine Summenzeile** — bricht jeden Import.
- PDF-Inhalt: § 17-Verweis, Aufbewahrungsfrist, **Erfassungsspalte**
  (Mitarbeiter/Arbeitgeber), Bruttolohn als "nachrichtlich" gekennzeichnet,
  Unterschriftsfelder. Kein Logo, keine Farben.
- `employerName` ist Pflicht — `requireExportReady()` prüft vorab, das UI
  blendet die Buttons aus und verlinkt auf die Einstellungen.
- HTML-Escaping für `note` und `name` (freier Nutzertext).
- `selfRecorded` wird in `/lib/queries/month.ts` abgeleitet; `createdById`
  verlässt die Query-Schicht nicht.

---

## US-03 — Nachtrag vergangener Tage

**Bereits durch US-02 abgedeckt.** Nur verifizieren:

- Datum frei wählbar, `MAX_BACKDATE_DAYS = 31`, Zukunft gesperrt
- Der Nachtrag erscheint im Monat des **Arbeitstags**, nicht der Erfassung
- Protokolliert wie jeder CREATE

Die 31-Tage-Grenze ist großzügiger als § 17 MiLoG (7 Tage). Bewusst: Ein
System, das den verspäteten Nachtrag verweigert, führt dazu, dass die Zeit
gar nicht erfasst wird.

---

## US-12 — Passwort zurücksetzen

**Als Admin setze ich ein Passwort zurück.**

- AK-1 Admin setzt neues Passwort für einen Mitarbeiter
- AK-2 Passwort erscheint **einmal** im Klartext
- AK-3 Regeln wie US-10 (min. 10 Zeichen), `hashPassword` wiederverwenden
- AK-4 Alle bestehenden Sessions invalidiert
- AK-5 Nur über `requireEmployeeTarget()`
- AK-6 Vorgang protokolliert
- AK-7 Hash erscheint nie im Protokoll

**Kritisch:**
- Das Klartextpasswort wird **nicht** über den Server-Action-Rückgabewert
  transportiert — es landet sonst in der RSC-Antwort, in DevTools und
  Proxy-Logs. Der Client hält den Wert in seinem State (er hat ihn gesendet).
- **Generator läuft clientseitig** (`crypto.getRandomValues`), nicht auf
  dem Server.
- `buf[i] % WORDS.length` ist bias-frei, solange `WORDS.length` eine
  Zweierpotenz ist. Der Test auf `=== 1024` sichert die Voraussetzung.
- Session-Löschung in derselben Transaktion wie die Passwortänderung.
- `SecurityLog` statt `AuditLog`: unterschiedliche Zwecke und
  Aufbewahrungspflichten. `AuditLog` unterliegt § 17 MiLoG, `SecurityLog` nicht.
- Wortliste: siehe `/lib/auth/wordlist.ts` (liegt bei, 1024 Einträge).

---

## US-11 — Änderungsprotokoll

**Als Admin sehe ich das Änderungsprotokoll eines Eintrags.**

- AK-1 Vollständige Historie: CREATE, alle UPDATEs, DELETE
- AK-2 Zeitpunkt, Urheber, Aktion, geänderte Felder mit Alt/Neu
- AK-3 Mitarbeiter- und Admin-Änderungen unterscheidbar
- AK-4 Gelöschte Einträge bleiben einsehbar
- AK-5 Nur mit `requireAdmin()`
- AK-6 Lesbare deutsche Darstellung, kein Roh-JSON

**Kritisch:**
- **Drei getrennte Fälle** in `buildChanges()`. Kein `??`-Fallback über die
  Fälle hinweg: Bei UPDATE ist `null` ein gültiger Zielwert (entfernte Notiz).
  `newV[f] ?? oldV[f]` würde die Löschung als "unverändert" darstellen —
  das Protokoll würde lügen. Gleiches gilt für `||` und den Wert `0`.
- `findUnique` ist von der Soft-Delete-Middleware ausgenommen und deckt AK-4
  für Einzeleinträge ab. Für die **Liste** gelöschter Einträge:
  `getDeletedEntries()` mit `$queryRaw`, `requireAdmin()` **in** der Funktion.
- AK-3 über die **Rolle**, nicht den Namen — ein Admin könnte "Anna Meier"
  heißen. Badge mit Text, nicht nur Farbe.
- Mitarbeiter sieht Fremdänderungen an **eigenen** Einträgen:
  `changedById: { not: user.id }`, formatierte Alt/Neu-Paare, kein Link
  auf die Admin-Route.
- Gelöschte Einträge werden nach `workDate` zugeordnet, nicht nach
  `deletedAt` — Beschriftung entsprechend klarstellen.

---

## US-14 — Jahressumme

**Als Mitarbeiter sehe ich meine Jahressumme gegen die Entgeltgrenze.**

- AK-1 Jahressumme in Stunden und Euro
- AK-2 Vergleich gegen 12 × `earningsLimit`
- AK-3 Gleiche Schwellen wie US-05
- AK-4 Monatsverteilung sichtbar
- AK-5 Admin sieht dieselbe Ansicht je Mitarbeiter
- AK-6 Zugriffsschutz
- AK-7 Monatsanzeige aus US-05 bleibt unverändert

**Kritisch:**
- **Jahressumme aus Minuten rechnen**, nicht als Summe der gerundeten
  Monatsbeträge. Zwölf Rundungen weichen um bis zu 6 Cent ab, und die Ampel
  kippt am Grenzwert je nach Rechenweg. Die Monatsbeträge bleiben gerundet
  (Anzeigewerte); die Differenz im UI erklären, wenn sie ungleich 0 ist.
- `evaluateCentsLimit()` teilt `WARNING_THRESHOLD` mit `evaluateLimit()`.
  Ein Test bindet beide aneinander.
- Zwölf Buckets, auch leere. Zukünftige Monate mit 0 €, nicht ausblenden —
  sonst wirkt die Jahressumme im März alarmierend hoch.
- Hinweis bei `user.createdAt` im laufenden Jahr: "Konto wurde im … angelegt"
  — nicht "Beschäftigung seit", das weiß das System nicht.
- `monthsOverLimit` nur nachrichtlich. **Keine** Auswertung der
  Zwei-Monats-Regel — das wäre eine sozialversicherungsrechtliche Bewertung.

---

## US-15 — Serverless-Anpassung

**Vor dem Deployment auf Vercel.**

- AK-1 PDF-Export funktioniert serverless
- AK-2 PDF enthält lesbaren Text
- AK-3 Rate-Limiting wirkt instanzübergreifend
- AK-4 Datumslogik unter UTC identisch zu Europe/Berlin
- AK-5 Prisma-Migrationen laufen gegen Supabase
- AK-6 Keine Änderung an Schema, Zeitlogik, Guards, Exportinhalt

**Kritisch:**
- Schriften als **Base64 in der Vorlage**, nicht per CDN. Der Nachweis muss
  in Jahren noch erzeugbar sein. `outputFileTracingIncludes` in
  `next.config.js` — sonst fehlen die Dateien in Produktion.
- `document.fonts.ready` abwarten. `domcontentloaded` feuert vor dem
  Font-Parsing; sonst rendert jeder zweite Export in der Fallback-Schrift.
- **Kein Browser-Singleton.** Function-Instanzen sind isoliert.
- Rate-Limit: bei Upstash-Ausfall **Fallback-Zähler**, nicht Totalsperre.
  Auf Vercel gibt es keinen Server, auf dem man ihn abschalten könnte.
  1-Sekunden-Timeout auf den Redis-Aufruf.
- `clearRateLimit()` nach erfolgreichem Login — es sollen Fehlversuche
  zählen, nicht Versuche.
- `runtime = "nodejs"`, `maxDuration = 60`, `memory = 1024` auf der
  Export-Route.
- Prisma-Middleware nur einmal registrieren (globalThis-Singleton).

---

## US-13 — Stammdaten-Audit (offen, Priorität Kann)

Änderungen an `hourlyRate`, `monthlyLimitHours` protokollieren.
Erfordert Schemaänderung: `AuditLog.timeEntryId` nullable,
`entityType`/`entityId` als generisches Paar.

Nicht umgesetzt. Bei drei Mitarbeitern tritt der Fall selten ein.
Falls zusammen mit `employmentStartDate` gebaut wird, beides gemeinsam
betrachten.
