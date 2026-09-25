"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; text: string; short?: string };

// Primary: the risk product. Secondary: context pages. Order = reading order of the product.
const PRIMARY: Item[] = [
  { href: "/risk", text: "Рейтинг" },
  { href: "/risk/map", text: "Мапа" },
  { href: "/risk/groups", text: "Групи" },
  { href: "/risk/buyers", text: "Замовники" },
  { href: "/risk/backtest", text: "Перевірка" },
  { href: "/risk/updates", text: "Нові рішення", short: "Рішення" },
];
const SECONDARY: Item[] = [
  { href: "/about", text: "Про проєкт" },
  { href: "/search", text: "Пошук" },
];
// pages without their own menu item that belong to one
const ALIASES: [string, string][] = [
  ["/tender", "/search"],
  ["/risk/company", "/risk"],
  ["/risk/tender", "/risk"],
  ["/risk/buyer", "/risk/buyers"],
  ["/risk/markets", "/risk"],
  ["/risk/watch", "/risk"],
  ["/risk/guide", "/about"],
  ["/reliability", "/about"],
  ["/osint", "/about"],
  ["/stats", "/about"],
];

const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** Header menu. The open page's item is a solid pill; sections of a product page map to their parent item. */
export default function NavLinks() {
  const path = usePathname() ?? "/";
  const alias = ALIASES.filter(([from]) => under(path, from)).sort((a, b) => b[0].length - a[0].length)[0]?.[1];
  const all = [...PRIMARY, ...SECONDARY].map((i) => i.href);
  const active = alias ?? all.filter((h) => under(path, h)).sort((a, b) => b.length - a.length)[0];

  const item = (it: Item, primary: boolean) => {
    const on = it.href === active;
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={[
          "relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition",
          on
            ? "bg-ink font-bold text-canvas shadow-[0_2px_10px_-4px_rgba(15,23,42,.6)]"
            : primary
              ? "font-semibold text-ink hover:bg-surface-strong"
              : "font-medium text-muted hover:bg-surface hover:text-ink",
        ].join(" ")}
      >
        <span className={it.short ? "hidden lg:inline" : ""}>{it.text}</span>
        {it.short && <span className="lg:hidden">{it.short}</span>}
      </Link>
    );
  };

  return (
    <nav aria-label="Основне меню" className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-line bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRIMARY.map((it) => item(it, true))}
      </div>
      <div className="hidden items-center gap-0.5 md:flex">
        {SECONDARY.map((it) => item(it, false))}
      </div>
      <Link
        href="/risk/watch"
        title="Мої списки"
        aria-label="Мої списки"
        className={`hidden h-9 w-9 items-center justify-center rounded-full border transition sm:inline-flex ${under(path, "/risk/watch") ? "border-ink bg-ink text-canvas" : "border-line bg-canvas text-ink hover:border-ink"}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </Link>
    </nav>
  );
}
