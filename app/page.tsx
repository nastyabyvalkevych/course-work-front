"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { num } from "@/lib/risk";
import { BacktestList, RiskRanking, RiskSummary } from "@/lib/types";

function Card({ href, title, text, tag }: { href: string; title: string; text: string; tag?: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-2xl border border-line bg-surface p-6 transition hover:border-accent">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-ink group-hover:text-accent">{title}</h3>
        {tag && <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted">{tag}</span>}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      <span className="mt-4 text-sm font-semibold text-accent">Відкрити →</span>
    </Link>
  );
}

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [backtests, setBacktests] = useState<BacktestList | null>(null);
  const [top, setTop] = useState<RiskRanking | null>(null);

  useEffect(() => {
    fetchJson<RiskSummary>("/api/risk/summary").then(setSummary).catch(() => {});
    fetchJson<BacktestList>("/api/risk/backtest").then(setBacktests).catch(() => {});
    fetchJson<RiskRanking>("/api/risk/ranking?limit=5&minTenders=20&excludeKnown=1&fullCoverageOnly=1").then(setTop).catch(() => {});
  }, []);

  const last = backtests?.items.at(-1);
  const p100 = last?.curve.find((c) => c.k === 100);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (/^\d{8}$|^\d{10}$/.test(v)) router.push(`/risk/company/${v}`);
    else if (/^UA-\d{4}-\d{2}-\d{2}-\d{6}-[a-z]$/i.test(v) || /^[0-9a-f]{32}$/i.test(v)) router.push(`/risk/tender/${encodeURIComponent(v)}`);
    else router.push(`/risk?q=${encodeURIComponent(v)}`);
  };

  return (
    <div className="flex flex-col gap-16 lg:gap-20">
      <section className="flex flex-col items-center gap-6 pt-8 text-center lg:pt-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Публічні закупівлі України · Prozorro + реєстр АМКУ</p>
        <h1 className="max-w-4xl text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-ink">
          Хто на торгах грає <span className="text-accent">не сам</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Сервіс дивиться, хто з ким постійно ходить на тендери, і показує компанії, чия поведінка схожа на поведінку фірм,
          яких Антимонопольний комітет уже покарав за змову. Це підказка, кого перевіряти першим, а не вирок.
        </p>

        <form onSubmit={submit} className="mt-2 w-full max-w-xl">
          <div className="relative flex items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ЄДРПОУ, назва компанії або номер тендера UA-2024-…"
              className="h-14 w-full rounded-2xl bg-surface pl-5 pr-32 text-base font-medium text-ink placeholder:text-muted/50 transition focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button type="submit" className="absolute bottom-2 right-2 top-2 rounded-xl bg-accent px-6 text-sm font-bold text-white transition hover:bg-accent/90">
              Перевірити
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">8 або 10 цифр відкриє картку компанії, номер UA-… відкриє картку тендера, назва — пошук у рейтингу.</p>
        </form>
      </section>

      {summary && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Тендерів у базі</p><p className="mt-3 text-3xl font-extrabold text-ink">{num(summary.tendersInDatabase)}</p><p className="mt-1 text-xs text-muted">Prozorro, 2015–2026</p></div>
          <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Компаній у графі</p><p className="mt-3 text-3xl font-extrabold text-ink">{num(summary.companiesScored)}</p><p className="mt-1 text-xs text-muted">кожна має оцінку ризику</p></div>
          <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Покараних АМКУ</p><p className="mt-3 text-3xl font-extrabold text-ink">{num(summary.companiesInRegister)}</p><p className="mt-1 text-xs text-muted">рішення 2023–2026, на них модель вчилась</p></div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Перевірка на минулому</p>
            {p100 && last ? (
              <>
                <p className="mt-3 text-3xl font-extrabold text-ink">{Math.round(p100.precision * 100)} зі 100</p>
                <p className="mt-1 text-xs text-muted">компаній з верху списку {last.cutoffYear} року покарано пізніше, навмання було б {Math.round(last.baseRate * 100)}</p>
              </>
            ) : <p className="mt-3 text-sm text-muted">рахується…</p>}
          </div>
        </section>
      )}

      <section className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-2xl font-bold text-ink">Як це працює</h2>
          <ol className="mt-5 space-y-5">
            {[
              ["Збираємо історію торгів", "Усі ставки компаній з Prozorro: хто, у якому тендері, за яку ціну, хто виграв."],
              ["Малюємо мапу зв'язків", "Компанії — точки, спільні тендери — лінії між ними. Змовники мусять зустрічатися на торгах, тому слід змови є саме в лініях."],
              ["Порівнюємо з уже покараними", "Сервіс вивчив історії компаній із реєстру АМКУ і шукає схожі: у самій компанії, у її партнерів і в партнерів партнерів."],
              ["Перевіряємо на майбутньому", "Даємо сервісу лише дані до кінця року і дивимось, кого АМКУ покарав потім."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-canvas">{i + 1}</div>
                <div><p className="font-semibold text-ink">{t}</p><p className="text-sm text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
          <Link href="/about" className="mt-6 inline-block text-sm font-semibold text-accent">Докладніше простими словами →</Link>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Кого перевіряти першим</h2>
            <Link href="/risk" className="text-sm font-semibold text-accent">весь рейтинг →</Link>
          </div>
          <p className="mt-1 text-xs text-muted">Компанії з повною історією, від 20 тендерів, ще не в реєстрі АМКУ.</p>
          <ul className="mt-4 divide-y divide-line">
            {(top?.items ?? []).map((c) => (
              <li key={c.edrpou} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/risk/company/${c.edrpou}`} className="block truncate font-semibold text-ink hover:text-accent">{c.name || c.edrpou}</Link>
                  <p className="font-mono text-xs text-muted">{c.edrpou} · {num(c.nTenders)} тендерів · {Math.round(c.winRate * 100)} % перемог</p>
                </div>
                <span className="shrink-0 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 font-mono text-xs font-bold text-red-800">{c.score.toFixed(2)}</span>
              </li>
            ))}
            {!top && <li className="py-3 text-sm text-muted">Завантаження…</li>}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center text-2xl font-bold text-ink">Інструменти</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card href="/risk" title="Рейтинг ризику" text="Список компаній за ризиком змови з фільтрами за областю, активністю і повнотою історії. Картки компаній з поясненням і мапою партнерів." />
          <Card href="/risk/map" title="Мапа України" text="Частка компаній високого ризику і покараних АМКУ по областях. Клік по області відкриває її список." />
          <Card href="/risk/backtest" title="Перевірка на минулому" text="Список підозрілих на кінець року поруч із реальними рішеннями АМКУ наступних років." />
          <Card href="/osint" title="Індикатори OECD" text="Прості ознаки, які аудитори перевіряють руками: єдиний учасник, постійні пари, надто часті перемоги, один постачальник на ринку." tag="простий спосіб" />
          <Card href="/reliability" title="Надійність системи" text="Наскільки стабільно працює сам сервіс: як часто відповідає правильно і які його частини найслабші." tag="для розробників" />
          <Card href="/search" title="Пошук по тендерах" text="Знайти тендер за словами з назви чи опису, якщо номера під рукою немає." tag="пошук" />
        </div>
      </section>

      <footer className="border-t border-line pt-8 text-center text-sm text-muted">
        <p>Дані: відкриті дані Prozorro і реєстр рішень Антимонопольного комітету на data.gov.ua. Магістерська робота, спеціальність «Інженерія програмного забезпечення».</p>
        <div className="mt-3 flex flex-wrap justify-center gap-4">
          <Link href="/about" className="transition hover:text-ink">Про проєкт</Link>
          <Link href="/risk" className="transition hover:text-ink">Ризики</Link>
          <Link href="/risk/map" className="transition hover:text-ink">Мапа</Link>
          <Link href="/risk/backtest" className="transition hover:text-ink">Перевірка</Link>
          <Link href="/osint" className="transition hover:text-ink">OSINT</Link>
          <Link href="/stats" className="transition hover:text-ink">Статистика</Link>
          <Link href="/reliability" className="transition hover:text-ink">Надійність</Link>
          <Link href="/search" className="transition hover:text-ink">Пошук</Link>
        </div>
      </footer>
    </div>
  );
}
