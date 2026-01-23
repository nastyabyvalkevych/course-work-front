import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prozorro Insight",
  description: "Search and analyze Prozorro tenders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Prozorro Insight
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  Тендерна аналітика
                </p>
              </div>
              <nav className="flex gap-4 text-sm font-medium text-slate-600">
                <a
                  className="rounded-full px-3 py-2 hover:bg-slate-100"
                  href="/"
                >
                  Головна
                </a>
                <a
                  className="rounded-full px-3 py-2 hover:bg-slate-100"
                  href="/stats"
                >
                  Статистика
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
