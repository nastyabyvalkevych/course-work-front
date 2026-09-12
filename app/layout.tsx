import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
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
  description: "Виявлення ознак змови учасників публічних закупівель України на графі спільних торгів",
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
          <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-line/50">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
              <a href="/" className="flex items-center gap-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-sm font-extrabold tracking-[0.05em] text-canvas transition group-hover:bg-accent">
                  PI
                </div>
                <div className="hidden sm:block">
                  <p className="text-lg font-extrabold leading-none tracking-tight text-ink">
                    Prozorro Insight
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted">
                    Ризик змови на торгах
                  </p>
                </div>
              </a>
              <nav className="flex items-center gap-1 sm:gap-2">
                <a
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                  href="/about"
                >
                  Про проєкт
                </a>
                <a
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                  href="/search"
                >
                  Пошук
                </a>
                <a
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                  href="/risk"
                >
                  Ризики
                </a>
                <a
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                  href="/risk/map"
                >
                  Мапа
                </a>
                <a
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                  href="/risk/backtest"
                >
                  Перевірка
                </a>
                <a
                  className="ml-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:bg-accent"
                  href="/risk"
                >
                  Почати
                </a>
              </nav>
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
