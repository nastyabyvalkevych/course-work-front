"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { Skeleton, Stat } from "@/components/ui";
import { evaluateSignals, formatSignalValue } from "@/lib/explain";
import { date, num, pct, riskBadgeClass, riskLabel } from "@/lib/risk";
import { RiskRanking, RiskSummary } from "@/lib/types";


function RiskHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = searchParams.get("region") ?? "";
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [ranking, setRanking] = useState<RiskRanking | null>(null);
  const [q, setQ] = useState("");
  const [tenderQ, setTenderQ] = useState("");
  const [excludeKnown, setExcludeKnown] = useState(true);
  const [fullOnly, setFullOnly] = useState(false);
  const [minTenders, setMinTenders] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  useEffect(() => {
    fetchJson<RiskSummary>("/api/risk/summary").then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    // filters changed: reset status synchronously, then fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      minTenders: String(minTenders),
      excludeKnown: excludeKnown ? "1" : "0",
      fullCoverageOnly: fullOnly ? "1" : "0",
    });
    if (q.trim()) params.set("q", q.trim());
    if (region) params.set("region", region);
    fetchJson<RiskRanking>(`/api/risk/ranking?${params}`)
      .then(setRanking)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [q, excludeKnown, fullOnly, minTenders, offset, region]);

  const onCompanySubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (/^\d{8}$|^\d{10}$/.test(v)) router.push(`/risk/company/${v}`);
    else setOffset(0);
  };
  const onTenderSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (tenderQ.trim()) router.push(`/risk/tender/${encodeURIComponent(tenderQ.trim())}`);
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Ризик змови на торгах</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Кого перевіряти першим
        </h1>
        <p className="max-w-3xl text-base text-muted">
          Сервіс оцінює, наскільки історія торгів компанії схожа на поведінку фірм,
          яких Антимонопольний комітет уже покарав за спотворення результатів торгів. Це
          інструмент пріоритезації перевірок, а не доказ порушення.
        </p>
      </section>

      <nav className="flex flex-wrap gap-2 text-sm">
        {[["/risk/map", "Мапа областей"], ["/risk/groups", "Хто ходить разом"], ["/risk/buyers", "Замовники"], ["/risk/markets", "Ринки і гроші"], ["/risk/backtest", "Перевірка на минулому"], ["/risk/updates", "Нові рішення АМКУ"], ["/risk/guide", "Як читати"], ["/risk/watch", "Мої списки"]].map(([h, t]) => (
          <Link key={h} href={h} className="rounded-full border border-line bg-surface px-3 py-1 font-semibold text-ink transition hover:border-accent hover:text-accent">{t}</Link>
        ))}
      </nav>

      {summary && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Компаній оцінено" value={num(summary.companiesScored)} sub="кожна має оцінку схожості з покараними" />
          <Stat label="У реєстрі АМКУ" value={num(summary.companiesInRegister)} sub="підтверджені рішення" />
          <Stat label="Тендерів у базі" value={num(summary.tendersInDatabase)} sub="Prozorro, 2015–2026" />
          <Stat
            label="Повна історія"
            value={num(summary.coverage.filter((c) => c.coverage === "full").reduce((a, c) => a + c.count, 0))}
            sub="компаній з повним покриттям"
          />
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={onCompanySubmit} className="rounded-2xl border border-line bg-surface p-5">
          <label className="text-sm font-semibold text-ink">Компанія</label>
          <div className="mt-2 flex gap-2">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
              placeholder="ЄДРПОУ або частина назви"
              className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent">
              Знайти
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Введіть 8 або 10 цифр коду, щоб одразу відкрити картку компанії.</p>
        </form>
        <form onSubmit={onTenderSubmit} className="rounded-2xl border border-line bg-surface p-5">
          <label className="text-sm font-semibold text-ink">Тендер</label>
          <div className="mt-2 flex gap-2">
            <input
              value={tenderQ}
              onChange={(e) => setTenderQ(e.target.value)}
              placeholder="UA-2024-12-25-014690-a"
              className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent">
              Перевірити
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Ризик учасників і їхня спільна історія до підписання договору.</p>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold uppercase tracking-wide text-ink">
            Рейтинг ризику{region ? <span className="ml-2 text-base font-semibold normal-case text-muted">· {region} <Link href="/risk" className="text-accent">скинути</Link> · <Link href="/risk/map" className="text-accent">мапа</Link></span> : <span className="ml-3 text-sm font-semibold normal-case"><Link href="/risk/map" className="text-accent">на мапі →</Link> · <Link href="/risk/backtest" className="text-accent">ретроспектива →</Link></span>}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={excludeKnown} onChange={(e) => { setExcludeKnown(e.target.checked); setOffset(0); }} />
              приховати вже покараних
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={fullOnly} onChange={(e) => { setFullOnly(e.target.checked); setOffset(0); }} />
              лише повна історія
            </label>
            <label className="flex items-center gap-2">
              мін. тендерів
              <select
                value={minTenders}
                onChange={(e) => { setMinTenders(Number(e.target.value)); setOffset(0); }}
                className="rounded-lg border border-line bg-white px-2 py-1"
              >
                {[1, 5, 10, 20, 50].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <p className="text-xs text-muted">
          «Чому в списку» — ознаки з історії торгів, за якими компанія помітно відрізняється від звичайних (поріг — приблизно
          верхні 10 % ринку). Наведіть на ознаку, щоб побачити значення і пояснення; повний перелік — у картці компанії.
          Оцінку ставить модель за всіма показниками і зв&apos;язками разом, тож компанія може мати високий ризик і без жодної
          окремої яскравої ознаки.
        </p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Компанія</th>
                <th className="px-4 py-3">Ризик</th>
                <th className="px-4 py-3">Чому в списку</th>
                <th className="px-4 py-3">Тендерів</th>
                <th className="px-4 py-3">Перемог</th>
                <th className="px-4 py-3">Партнерів</th>
                <th className="px-4 py-3">Історія</th>
                <th className="px-4 py-3">АМКУ</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-muted">Завантаження…</td></tr>
              )}
              {!loading && ranking?.items.map((c) => (
                <tr key={c.edrpou} className="border-t border-line hover:bg-surface/60">
                  <td className="px-4 py-3 text-muted">{c.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/risk/company/${c.edrpou}`} className="font-semibold text-ink hover:text-accent">
                      {c.name ?? c.edrpou}
                    </Link>
                    <div className="text-xs text-muted">{c.edrpou}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(c.score)}`}>
                      {pct(c.score)} · {riskLabel(c.score)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const hits = evaluateSignals(c.features, { nTenders: c.nTenders, degree: c.degree, sanctionedPartners: c.sanctionedNeighbors ?? 0 }).filter((r) => r.hit);
                      if (!hits.length) return <span className="text-xs text-muted">без явних ознак</span>;
                      return (
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {hits.slice(0, 3).map((r) => (
                            <span key={r.signal.id} title={`${r.signal.title}: ${formatSignalValue(r.signal, r.value)} (поріг ${r.signal.threshold}). ${r.signal.text}`}
                              className="cursor-help rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[0.7rem] font-semibold text-red-800">
                              {r.signal.short}
                            </span>
                          ))}
                          {hits.length > 3 && (
                            <Link href={`/risk/company/${c.edrpou}#signals`} className="rounded-md border border-line px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted hover:text-accent">+{hits.length - 3}</Link>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">{num(c.nTenders)}</td>
                  <td className="px-4 py-3">{num(c.nWon)} <span className="text-muted">({pct(c.winRate)})</span></td>
                  <td className="px-4 py-3">{num(c.degree)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{c.coverage === "full" ? "повна" : c.coverage === "capped" ? "обрізана" : "часткова"}</td>
                  <td className="px-4 py-3 text-xs">{c.label ? <span className="font-semibold text-red-700">рішення {date(c.firstDecision)}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!ranking && <Skeleton lines={8} />}
      {ranking && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Показано {ranking.offset + 1}–{Math.min(ranking.offset + limit, ranking.total)} з {num(ranking.total)}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Назад</button>
              <button disabled={offset + limit >= ranking.total} onClick={() => setOffset(offset + limit)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Далі</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function RiskHome() {
  return (
    <Suspense fallback={<p className="text-muted">Завантаження…</p>}>
      <RiskHomeInner />
    </Suspense>
  );
}
