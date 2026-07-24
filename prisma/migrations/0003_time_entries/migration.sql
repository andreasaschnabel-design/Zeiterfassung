-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeEntry_userId_workDate_idx" ON "TimeEntry"("userId", "workDate");

-- CreateIndex
CREATE INDEX "TimeEntry_deletedAt_idx" ON "TimeEntry"("deletedAt");

-- CreateIndex
CREATE INDEX "AuditLog_timeEntryId_changedAt_idx" ON "AuditLog"("timeEntryId", "changedAt");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints (DE-07 + Zeitformat). architecture.md: "DB-Constraints und Trigger"
ALTER TABLE "TimeEntry"
    ADD CONSTRAINT time_format_check
    CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       AND "endTime"   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    ADD CONSTRAINT end_after_start_check
    CHECK ("endTime" > "startTime");

-- Trigger: TimeEntry.userId muss auf ein EMPLOYEE-Konto zeigen
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
