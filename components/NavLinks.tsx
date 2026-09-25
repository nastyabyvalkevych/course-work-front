"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [string, string][] = [
  ["/about", "Про проєкт"],
  ["/search", "Пошук"],
  ["/risk", "Ризики"],
  ["/risk/map", "Мапа"],
  ["/risk/backtest", "Перевірка"],
  ["/risk/groups", "Групи"],
  ["/risk/buyers", "Замовники"],
];

// pages without their own menu item that belong to one: a tender card is reached from search
const ALIASES: [string, string][] = [["/tender", "/search"]];

const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** Header menu; the item of the open page is highlighted (longest matching prefix wins). */
export default function NavLinks() {
  const path = usePathname() ?? "/";
  const alias = ALIASES.find(([from]) => under(path, from))?.[1];
  const active = alias ?? LINKS.map(([h]) => h).filter((h) => under(path, h)).sort((a, b) => b.length - a.length)[0];
  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {LINKS.map(([href, text]) => {
        const on = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${on ? "bg-surface text-accent shadow-[inset_0_-2px_0_currentColor]" : "text-ink hover:bg-surface"}`}
          >
            {text}
          </Link>
        );
      })}
      <Link className="ml-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:bg-accent" href="/risk">
        Почати
      </Link>
    </nav>
  );
}
