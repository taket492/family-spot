import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { Noto_Sans_JP, Inter } from 'next/font/google';

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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${noto.variable} ${inter.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
