import './i18n/i18n';
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";
import { PrimeReactProvider } from 'primereact/api';
import { ClientInit } from './client-init';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

import ClientI18nProvider from './i18n/ClientI18nProvider';

export const metadata: Metadata = {
  title: "SpeakAI",
  description: "A beginner-friendly AI-powered conversation practice application for language learners of all proficiency levels.",
  icons: {
    icon: '/images/favicon.png'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen w-screen`}
      >
        <ClientI18nProvider>
          <PrimeReactProvider>
            <ClientInit />
            <Providers>{children}</Providers>
          </PrimeReactProvider>
        </ClientI18nProvider>
      </body>
    </html>
  );
}
