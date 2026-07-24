import { PrismaClient } from "@prisma/client";

// Serverless-Besonderheit (architecture.md, v2.0): Der Client wird als
// globalThis-Singleton gehalten, damit unter Hot-Reload und wiederverwendeten
// Function-Instanzen nicht bei jeder Anfrage eine neue Verbindung entsteht.
// Die Middleware wird genau EINMAL registriert (Flag am globalThis).

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaMiddlewareRegistered: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// DE-04: Soft-Delete durchgaengig. Kein Query auf TimeEntry ohne
// `deletedAt: null` — erzwungen ueber Middleware, nicht ueber Disziplin.
// `deletedAt: null` steht NACH dem Spread und ist damit nicht ueberschreibbar.
// `findUnique` ist bewusst ausgenommen: Guards muessen "geloescht" von
// "existiert nicht" unterscheiden koennen. Zugriff auf geloeschte Listen nur
// ueber getDeletedEntries() mit $queryRaw (US-11).
if (!globalForPrisma.prismaMiddlewareRegistered) {
  prisma.$use(async (params, next) => {
    if (params.model !== "TimeEntry") return next(params);
    if (
      [
        "findMany",
        "findFirst",
        "findFirstOrThrow",
        "count",
        "aggregate",
        "groupBy",
      ].includes(params.action)
    ) {
      params.args = params.args ?? {};
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    return next(params);
  });
  globalForPrisma.prismaMiddlewareRegistered = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
