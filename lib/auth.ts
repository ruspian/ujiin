// import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

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

        // cari user di database
        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username as string,
          },
        });

        // jika user atau password tidak cocok, kembalikan null
        if (!user || !user?.password) {
          return null;
        }

        const isPasswordValid = await bcryptjs.compare(
          credentials.password as string,
          user.password as string,
        );

        // jika password tidak valid
        if (!isPasswordValid) {
          return null;
        }

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

  secret: process.env.NEXTAUTH_SECRET,
});
