import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import Link from "next/link";

import NavLinks from "@/components/NavLinks";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prozorro Insight",
  description: "Хто на торгах грає не сам: ознаки змови в публічних закупівлях України",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={`${manrope.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-[0.8rem] font-extrabold tracking-[0.05em] text-canvas transition group-hover:bg-accent">
                  PI
                </div>
                <div className="hidden sm:block">
                  <p className="text-base font-extrabold leading-none tracking-tight text-ink">
                    Prozorro Insight
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted">
                    Ризик змови на торгах
                  </p>
                </div>
              </Link>
              <NavLinks />
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
