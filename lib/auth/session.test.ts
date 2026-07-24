import { describe, it, expect, vi, beforeEach } from "vitest";

// Prisma wird gemockt — der Session-Test prueft die Zeit-/Zustandslogik,
// nicht die Datenbank. vi.hoisted, weil vi.mock an den Dateianfang gehoben
// wird und sonst nicht auf prismaMock zugreifen koennte.
const prismaMock = vi.hoisted(() => ({
  session: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { SESSION_DAYS } from "@/lib/constants";
import {
  createSession,
  destroySession,
  generateToken,
  hashToken,
  invalidateUserSessions,
  validateSession,
} from "./session";

const DAY_MS = 24 * 60 * 60 * 1000;

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "a@b.de",
    passwordHash: "x",
    name: "A",
    role: "EMPLOYEE",
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Token-Hashing", () => {
  it("speichert nie den Token selbst — id ist sha256(token)", () => {
    const token = generateToken();
    const id = hashToken(token);
    expect(id).not.toBe(token);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    // Deterministisch:
    expect(hashToken(token)).toBe(id);
  });
});

describe("createSession", () => {
  it("legt eine Session mit gehashter id und 30-Tage-Ablauf an", async () => {
    prismaMock.session.create.mockResolvedValue({});
    const now = new Date("2026-01-01T00:00:00Z");
    const { token, expiresAt } = await createSession("u1", now);

    const arg = prismaMock.session.create.mock.calls[0][0].data;
    expect(arg.id).toBe(hashToken(token));
    expect(arg.userId).toBe("u1");
    expect(expiresAt.getTime()).toBe(now.getTime() + SESSION_DAYS * DAY_MS);
  });
});

describe("validateSession", () => {
  it("liefert null bei unbekanntem Token", async () => {
    prismaMock.session.findUnique.mockResolvedValue(null);
    expect(await validateSession("tok")).toBeNull();
  });

  it("lehnt eine abgelaufene Session ab und raeumt sie auf", async () => {
    const now = new Date("2026-02-01T00:00:00Z");
    prismaMock.session.findUnique.mockResolvedValue({
      id: hashToken("tok"),
      userId: "u1",
      expiresAt: new Date(now.getTime() - 1000),
      user: activeUser(),
    });
    expect(await validateSession("tok", now)).toBeNull();
    expect(prismaMock.session.deleteMany).toHaveBeenCalledOnce();
  });

  it("wirft einen deaktivierten Nutzer sofort raus (isActive in validateSession)", async () => {
    const now = new Date("2026-02-01T00:00:00Z");
    prismaMock.session.findUnique.mockResolvedValue({
      id: hashToken("tok"),
      userId: "u1",
      expiresAt: new Date(now.getTime() + 10 * DAY_MS),
      user: activeUser({ isActive: false }),
    });
    expect(await validateSession("tok", now)).toBeNull();
    expect(prismaMock.session.deleteMany).toHaveBeenCalledOnce();
    expect(prismaMock.session.update).not.toHaveBeenCalled();
  });

  it("verlaengert, wenn die Restlaufzeit unter (SESSION_DAYS-1) Tagen liegt", async () => {
    const now = new Date("2026-02-01T00:00:00Z");
    prismaMock.session.findUnique.mockResolvedValue({
      id: hashToken("tok"),
      userId: "u1",
      // Restlaufzeit 10 Tage < 29 Tage → verlaengern
      expiresAt: new Date(now.getTime() + 10 * DAY_MS),
      user: activeUser(),
    });
    prismaMock.session.update.mockResolvedValue({});
    const user = await validateSession("tok", now);
    expect(user?.id).toBe("u1");
    expect(prismaMock.session.update).toHaveBeenCalledOnce();
    const newExpiry = prismaMock.session.update.mock.calls[0][0].data.expiresAt;
    expect(newExpiry.getTime()).toBe(now.getTime() + SESSION_DAYS * DAY_MS);
  });

  it("verlaengert hoechstens einmal taeglich (frische Session bleibt unangetastet)", async () => {
    const now = new Date("2026-02-01T00:00:00Z");
    prismaMock.session.findUnique.mockResolvedValue({
      id: hashToken("tok"),
      userId: "u1",
      // Restlaufzeit 30 Tage → gerade eben verlaengert, nichts tun
      expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY_MS),
      user: activeUser(),
    });
    const user = await validateSession("tok", now);
    expect(user?.id).toBe("u1");
    expect(prismaMock.session.update).not.toHaveBeenCalled();
  });
});

describe("invalidateUserSessions / destroySession", () => {
  it("loescht alle Sessions eines Nutzers (Session-Fixation)", async () => {
    prismaMock.session.deleteMany.mockResolvedValue({ count: 2 });
    await invalidateUserSessions("u1");
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
  });

  it("destroySession loescht ueber die gehashte id", async () => {
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });
    await destroySession("tok");
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { id: hashToken("tok") },
    });
  });
});
