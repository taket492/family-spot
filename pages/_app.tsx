import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { Noto_Sans_JP, Inter } from 'next/font/google';
import Head from 'next/head';
import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';

const noto = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-en',
  display: 'swap',
});

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      // Register service worker for PWA installability/offline
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {/* ignore */});
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <div className={`${noto.variable} ${inter.variable}`}>
        <Head>
          <meta name="theme-color" content="#4CAF50" />
          <meta name="mobile-web-app-capable" content="yes" />
          {/* Include credentials so manifest loads on protected preview URLs */}
          <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
          {/* Favicon */}
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="icon" href="/favicon.ico" sizes="any" />
          {/* Performance hints for map tiles */}
          <link rel="preconnect" href="https://tile.openstreetmap.org" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="//tile.openstreetmap.org" />
          <link rel="preconnect" href="https://api.maptiler.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="//api.maptiler.com" />
          {/* iOS PWA meta */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="FamilySpots" />
          <link rel="apple-touch-icon" href="/images/cmf6ulot60000bh50n3byvv6p.jpg" />
        </Head>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}
