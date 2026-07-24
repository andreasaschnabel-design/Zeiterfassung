import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/hash";

// Deployment A6: legt Admin-Konto und globale Parameter an.
//   ADMIN_EMAIL="du@firma.de" ADMIN_PASSWORD="..." npm run seed
// Optional: EMPLOYER_NAME="..." (sonst leer, spaeter ueber /admin/settings).

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

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", isActive: true },
    create: {
      email,
      name: "Administrator",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Globale Parameter — nur anlegen, vorhandene Werte nicht ueberschreiben.
  const defaults: Record<string, string> = {
    minimumWage: "13.90",
    earningsLimit: "556",
    employerName: process.env.EMPLOYER_NAME?.trim() ?? "",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  console.log(`Seed abgeschlossen. Admin: ${admin.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
