import { redirect } from "next/navigation";

// Einstieg. Nicht angemeldete Nutzer fangt bereits die Middleware ab (→ /login);
// angemeldete leitet die Startseite ins Dashboard weiter.
export default function Home() {
  redirect("/dashboard");
}
