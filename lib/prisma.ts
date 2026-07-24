import { PrismaClient } from "@prisma/client";

// Serverless-Besonderheit (architecture.md, v2.0): Der Client wird als
// globalThis-Singleton gehalten, damit unter Hot-Reload und wiederverwendeten
// Function-Instanzen nicht bei jeder Anfrage eine neue Verbindung entsteht.
//
// Die Soft-Delete-Middleware (DE-04) wird erst mit US-02 registriert, sobald
// das Modell TimeEntry existiert. Kein Vorgriff.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
