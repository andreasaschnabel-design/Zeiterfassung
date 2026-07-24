import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/hash";

// US-10 (Kritisch): Wiederherstellungsweg gegen Aussperrung. Setzt Passwort und
// isActive per Umgebungsvariable ueber die Konsole:
//   ADMIN_EMAIL="du@firma.de" ADMIN_PASSWORD="neues-passwort" npm run admin:reset
//
// Bestehende Sessions des Kontos werden invalidiert (wie ein Passwort-Reset).

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL und ADMIN_PASSWORD muessen gesetzt sein.");
  }
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD muss mindestens 10 Zeichen haben.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Kein Konto mit E-Mail ${email} gefunden.`);
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { passwordHash, isActive: true },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log(`Passwort und Aktivstatus fuer ${email} zurueckgesetzt.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
