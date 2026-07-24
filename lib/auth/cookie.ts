// Name des Session-Cookies. Bewusst in einem eigenen, abhaengigkeitsfreien
// Modul: Die Edge-Middleware (DE-06) importiert nur diese Konstante und darf
// nichts aus dem Node-Runtime (next/headers, Prisma) mitziehen.
export const SESSION_COOKIE = "session";
