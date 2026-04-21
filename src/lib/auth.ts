import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

import type { Role } from '@/lib/permissions';

// Extend NextAuth types to include user.id, role, hasMembership, and themePreference in session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      hasMembership: boolean;
      // CR9 F2: cross-device theme preference. Always resolved (never undefined) at session read.
      themePreference: 'dark' | 'light';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    hasMembership: boolean;
    // CR9 F2: mirror DB preference into the JWT so the session callback doesn't re-fetch.
    themePreference: 'dark' | 'light';
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt', // REQUIRED for credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          return null; // Generic null - don't reveal if email exists
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? 'member';
        // Fetch membership + theme preference on initial login
        const [membership, dbUser] = await Promise.all([
          db.membership.findUnique({
            where: { userId: user.id },
            select: { status: true },
          }),
          db.user.findUnique({
            where: { id: user.id },
            select: { themePreference: true },
          }),
        ]);
        token.hasMembership = membership?.status === 'ACTIVE';
        token.themePreference = (dbUser?.themePreference === 'light' ? 'light' : 'dark');
      }
      // Refresh role, membership, and theme from database on session update
      if (trigger === 'update') {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, themePreference: true },
        });
        if (dbUser) {
          token.role = dbUser.role as Role;
          token.themePreference = (dbUser.themePreference === 'light' ? 'light' : 'dark');
        }
        const membership = await db.membership.findUnique({
          where: { userId: token.id },
          select: { status: true },
        });
        token.hasMembership = membership?.status === 'ACTIVE';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.hasMembership = token.hasMembership as boolean;
        // CR9 F2: mirror DB theme preference into the session so root layout can seed SSR <html class="...">
        session.user.themePreference = (token.themePreference === 'light' ? 'light' : 'dark');
      }
      return session;
    },
  },
};
