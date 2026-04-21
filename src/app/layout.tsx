import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { Providers } from "./providers";
import { authOptions } from "@/lib/auth";
import { getUserLanguage } from "@/lib/translation/helpers";
import { getCachedActiveLanguages } from "@/lib/cached-queries";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScienceExperts.ai",
  description: "Where science meets AI — courses, community, and global collaboration.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fail-open: never crash the root layout if the language or session resolver throws
  const [userLanguage, activeLanguages, session] = await Promise.all([
    getUserLanguage().catch((err) => {
      console.error('[RootLayout] getUserLanguage failed, defaulting to en:', err);
      return 'en';
    }),
    getCachedActiveLanguages(),
    getServerSession(authOptions).catch(() => null),
  ]);

  // CR9 F2: SSR-seed the theme class so first paint matches the user's DB preference (no FOUC on cross-device login).
  // Anonymous visitors default to 'dark' (brand choice); next-themes then hydrates from localStorage if present.
  const initialTheme: 'dark' | 'light' = session?.user?.themePreference === 'light' ? 'light' : 'dark';

  return (
    <html lang={userLanguage} className={initialTheme} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers initialLanguage={userLanguage} activeLanguages={activeLanguages} initialTheme={initialTheme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
