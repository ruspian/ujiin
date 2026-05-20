import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";

// GLOBAL MOCKING SEBELUM IMPORT FILE UTAMA

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => {
  const mockCompare = vi.fn();
  return {
    compare: mockCompare,
    default: { compare: mockCompare },
  };
});

// Mock NextAuth sekaligus Credentials provider agar bertindak sebagai passthrough murni
vi.mock("next-auth", () => {
  return {
    default: vi.fn().mockImplementation((config: Record<string, unknown>) => {
      // Amankan konfigurasi utuh ke global namespace tanpa tumpukan temporal dead zone
      (globalThis as Record<string, unknown>)._interceptedAuthConfig = config;
      return {
        handlers: { GET: vi.fn(), POST: vi.fn() },
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
      };
    }),
  };
});

// Mocking sub-modul providers secara terisolasi agar fungsi authorize tidak tergerus kompilasi internal
vi.mock("next-auth/providers/credentials", () => {
  return {
    default: vi.fn().mockImplementation((config: Record<string, unknown>) => {
      // Kembalikan objek konfigurasi mentah apa adanya agar properti authorize tetap utuh kinerjanya
      return config;
    }),
  };
});

// Sekarang aman meng-import file utama lu tanpa takut kehilangan instansi fungsi asli
import "@/lib/auth";
import { Role } from "@prisma/client";

// 2. KONTRAK STRUKTUR INTERFACE (ZERO ANY)

interface TargetAuthorize {
  authorize: (
    credentials: Record<string, string>,
  ) => Promise<Record<string, unknown> | null>;
}

interface TargetCallbacks {
  jwt: (params: {
    token: Record<string, unknown>;
    user?: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>;
  session: (params: {
    session: { user: Record<string, unknown> };
    token: Record<string, unknown>;
  }) => Promise<{ user: Record<string, unknown> }>;
}

describe("Pengujian Konfigurasi Otentikasi - Auth.js (Single File Hoisted Mode)", () => {
  let authorizeFn: (
    credentials: Record<string, string>,
  ) => Promise<Record<string, unknown> | null>;
  let jwtCallback: TargetCallbacks["jwt"];
  let sessionCallback: TargetCallbacks["session"];

  beforeEach(() => {
    vi.clearAllMocks();

    const rawConfig = (globalThis as Record<string, unknown>)
      ._interceptedAuthConfig as Record<string, unknown> | undefined;

    if (!rawConfig) {
      throw new Error(
        "Gagal menemukan objek konfigurasi NextAuth di scope global.",
      );
    }

    const providers = rawConfig.providers as
      | Record<string, unknown>[]
      | undefined;
    const callbacks = rawConfig.callbacks as TargetCallbacks | undefined;

    if (!providers?.[0] || typeof providers[0].authorize !== "function") {
      throw new Error(
        "Gagal mengekstrak fungsi authorize dari Credentials Provider.",
      );
    }

    // Amankan referensi fungsi authorize asli milik lu ke scope pengujian lokal
    authorizeFn = providers[0].authorize as TargetAuthorize["authorize"];

    if (callbacks?.jwt) jwtCallback = callbacks.jwt;
    if (callbacks?.session) sessionCallback = callbacks.session;
  });

  type MockUserFindUnique = Awaited<ReturnType<typeof prisma.user.findUnique>>;

  // TES SEKTOR PROVIDER - AUTHORIZE ENGINE

  describe("Credentials Provider - authorize()", () => {
    test("Harus langsung return null jika input username atau password kosong", async () => {
      const hasil = await authorizeFn({ username: "", password: "" });

      expect(hasil).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("Harus return null jika akun pengguna tidak ditemukan di database", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const hasil = await authorizeFn({
        username: "pian_palsu",
        password: "123",
      });

      expect(hasil).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: "pian_palsu" },
      });
    });

    test("Harus return null jika kata sandi (password) salah saat dicocokkan via Bcrypt", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr-pian",
        name: "Ruspian",
        username: "ruspian",
        password: "$2a$10$hashedsecretkey",
        role: "ADMIN" as Role,
      } as unknown as MockUserFindUnique);

      (vi.mocked(bcryptjs.compare) as Mock).mockResolvedValue(false);

      const hasil = await authorizeFn({
        username: "ruspian",
        password: "salah-password",
      });

      expect(hasil).toBeNull();
      expect(bcryptjs.compare).toHaveBeenCalledWith(
        "salah-password",
        "$2a$10$hashedsecretkey",
      );
    });

    test("Harus sukses mengembalikan payload user ringkas jika username dan password cocok 100%", async () => {
      const mockDbUser = {
        id: "usr-pian",
        name: "Ruspian",
        username: "ruspian",
        password: "$2a$10$hashedsecretkey",
        role: "ADMIN" as Role,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        mockDbUser as unknown as MockUserFindUnique,
      );
      (vi.mocked(bcryptjs.compare) as Mock).mockResolvedValue(true);

      const hasil = await authorizeFn({
        username: "ruspian",
        password: "passwordRahasia",
      });

      expect(hasil).toEqual({
        id: "usr-pian",
        name: "Ruspian",
        username: "ruspian",
        role: "ADMIN",
      });
    });
  });

  // TES SEKTOR CALLBACKS (JWT & SESSION)

  describe("Auth Callbacks - Token & Session Data Flow", () => {
    test("Callback jwt() harus sukses menyuntikkan data user ke dalam payload token", async () => {
      const mockToken = {};
      const mockUserPayload = {
        id: "usr-pian",
        name: "Ruspian",
        username: "ruspian",
        role: "ADMIN" as Role,
      };

      if (jwtCallback) {
        const hasilToken = await jwtCallback({
          token: mockToken,
          user: mockUserPayload,
        });

        expect(hasilToken).toEqual({
          id: "usr-pian",
          name: "Ruspian",
          username: "ruspian",
          role: "ADMIN",
        });
      }
    });

    test("Callback session() harus meneruskan properti dari token ke dalam object session user", async () => {
      const mockSession = { user: {} };
      const mockTokenPayload = {
        id: "usr-pian",
        name: "Ruspian",
        username: "ruspian",
        role: "ADMIN" as Role,
      };

      if (sessionCallback) {
        const hasilSession = await sessionCallback({
          session: mockSession,
          token: mockTokenPayload,
        });

        expect(hasilSession.user).toEqual({
          id: "usr-pian",
          name: "Ruspian",
          username: "ruspian",
          role: "ADMIN",
        });
      }
    });
  });
});
