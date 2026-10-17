import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { ThemeProvider } from 'next-themes';
import { pageIndexable, robotsFor } from '@/lib/seo/indexable';
import { SiteChrome } from './site-chrome';
import './globals.css';

export const metadata: Metadata = {
  title: 'hlcharts',
  // Pages without their own rule follow the site's: noindex until SITE_PUBLIC.
  robots: robotsFor(pageIndexable()),
};

/**
 * Light or dark follows the visitor's system until they pick one in the
 * header (next-themes sets the `dark` class on <html> before the page paints,
 * hence suppressHydrationWarning). Geist ships with the site: no font request
 * leaves the visitor's browser.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteChrome>{children}</SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
