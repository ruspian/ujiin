import { randomUUID } from "node:crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  isRateLimited,
  recordFailure,
  resetRateLimit,
} from "./rate-limit";

// Hash palsu agar username yang tidak ada tetap menjalani bcrypt.compare
// (waktu respons sama, keberadaan username tidak bisa ditebak).
let dummyHash: string | null = null;
function getDummyHash(): string {
  if (dummyHash === null) {
    try {
      dummyHash = bcryptjs.hashSync(randomUUID(), 10);
    } catch {
      dummyHash = "invalid";
    }
  }
  return dummyHash;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // batas sesi login selama 24 jam
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "username" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) {
          return null;
        }

        const username = String(credentials.username).trim().slice(0, 100);
        const password = String(credentials.password).slice(0, 200);
        const limitKey = `login-guru:${username.toLowerCase()}`;

        // terlalu banyak gagal -> tolak tanpa memeriksa password
        if (await isRateLimited(limitKey, LOGIN_MAX_FAILURES)) {
          return null;
        }

        // cari user di database
        // Username dicocokkan tanpa membedakan huruf besar/kecil (data baru
        // disimpan huruf kecil, data lama bisa campur). Yang persis sama diutamakan.
        const user =
          (await prisma.user.findUnique({ where: { username } })) ??
          (await prisma.user.findFirst({
            where: { username: { equals: username, mode: "insensitive" } },
          }));

        const isPasswordValid = await bcryptjs.compare(
          password,
          user?.password ?? getDummyHash(),
        );

        // jika user tidak ada / password tidak valid
        if (!user || !user.password || !isPasswordValid) {
          await recordFailure(limitKey, LOGIN_WINDOW_MS);
          return null;
        }

        await resetRateLimit(limitKey);

        // jika user dan password valid
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.name = user.name as string;
        token.username = user.username as string;
        token.role = user.role as Role;
        return token;
      }

      // Setiap sesi yang sudah ada diperiksa ulang ke database: akun yang
      // dihapus langsung kehilangan akses, dan perubahan role (mis. admin
      // diturunkan jadi guru) berlaku seketika, bukan setelah token 24 jam habis.
      if (token.id) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, username: true, role: true },
          });
          if (!fresh) return null;
          token.name = fresh.name;
          token.username = fresh.username;
          token.role = fresh.role;
        } catch (error) {
          // Database sedang bermasalah: jangan mengeluarkan semua pengguna.
          console.error("JWT_REFRESH_ERROR:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.username = token.username as string;
        session.user.role = token.role as Role;
      }

      return session;
    },
  },

  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
