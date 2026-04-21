'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { TranslationProvider, type ActiveLanguage } from '@/components/translation/TranslationContext';
import { GlobalTranslator } from '@/components/translation/GlobalTranslator';

interface ProvidersProps {
  children: React.ReactNode;
  /** Initial language from server (user's profile preference) */
  initialLanguage?: string;
  /** Admin-toggled active languages, threaded from root layout */
  activeLanguages?: ActiveLanguage[];
  /**
   * CR9 F2: SSR-seeded theme. For authed users this is their DB
   * `themePreference` so cross-device login lands in the correct mode;
   * for anonymous visitors this defaults to 'dark' (brand choice).
   */
  initialTheme?: 'dark' | 'light';
}

export function Providers({ children, initialLanguage, activeLanguages, initialTheme = 'dark' }: ProvidersProps) {
  return (
    // CR9 F2: brand-opinion defaults. enableSystem=false so OS preference can't override the user's explicit choice.
    // storageKey is explicit to avoid collisions on future multi-app deploys. disableTransitionOnChange prevents
    // mid-swap flashes on pages with many animated elements.
    <ThemeProvider
      attribute="class"
      defaultTheme={initialTheme}
      enableSystem={false}
      storageKey="scienceexperts-theme"
      disableTransitionOnChange
    >
      <SessionProvider>
        <TranslationProvider initialLanguage={initialLanguage} activeLanguages={activeLanguages}>
          {children}
          <GlobalTranslator />
        </TranslationProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
