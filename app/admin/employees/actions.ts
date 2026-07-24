"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireEmployeeTarget } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/hash";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/lib/validation/employee";

export type FormState = { error?: string };

function isEmailConflict(e: unknown): boolean {
  // AK-3 (Kritisch): Eindeutigkeit ueber den DB-Unique-Constraint, NICHT ueber
  // ein Vorab-findUnique (Race Condition). P2002 = unique constraint failed.
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

// US-10/AK-2: Mitarbeiter anlegen.
export async function createEmployee(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin(); // AK-7

  const parsed = createEmployeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    hourlyRate: formData.get("hourlyRate"),
    monthlyLimitHours: formData.get("monthlyLimitHours"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungueltig" };
  }

  const { name, email, hourlyRate, monthlyLimitHours, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  let employeeId: string;
  try {
    const employee = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        // KEIN role aus dem Formular — immer EMPLOYEE (US-10, Kritisch).
        role: "EMPLOYEE",
        hourlyRate,
        monthlyLimitHours,
        isActive: true,
      },
    });
    employeeId = employee.id;
  } catch (e) {
    if (isEmailConflict(e)) {
      return { error: "Diese E-Mail ist bereits vergeben." };
    }
    throw e;
  }

  redirect(`/admin/employees/${employeeId}`);
}

// US-10/AK-4: Stammdaten bearbeiten.
export async function updateEmployee(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  await requireEmployeeTarget(id); // laedt + prueft EMPLOYEE (inkl. requireAdmin)

  const parsed = updateEmployeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    hourlyRate: formData.get("hourlyRate"),
    monthlyLimitHours: formData.get("monthlyLimitHours"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungueltig" };
  }

  try {
    await prisma.user.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (isEmailConflict(e)) {
      return { error: "Diese E-Mail ist bereits vergeben." };
    }
    throw e;
  }

  redirect(`/admin/employees/${id}`);
}

// US-10/AK-5: Deaktivieren statt Loeschen (Zeiteintraege bleiben erhalten).
export async function setEmployeeActive(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  await requireEmployeeTarget(id); // gilt auch hier (US-10, Kritisch)

  if (active) {
    await prisma.user.update({ where: { id }, data: { isActive: true } });
  } else {
    // Deaktivierung loescht Sessions in DERSELBEN Transaktion (Kritisch).
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { isActive: false } }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);
  }

  redirect(`/admin/employees/${id}`);
}
