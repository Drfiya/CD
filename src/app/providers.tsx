'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { TranslationProvider } from '@/components/translation/TranslationContext';
import { GlobalTranslator } from '@/components/translation/GlobalTranslator';

interface ProvidersProps {
  children: React.ReactNode;
  /** Initial language from server (user's profile preference) */
  initialLanguage?: string;
}

export function Providers({ children, initialLanguage }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <TranslationProvider initialLanguage={initialLanguage}>
          {children}
          <GlobalTranslator />
        </TranslationProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
