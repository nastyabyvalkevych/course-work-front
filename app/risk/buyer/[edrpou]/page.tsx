"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import CsvButton from "@/components/CsvButton";
import { fetchJson } from "@/lib/api";
import { date, money, num, pct, riskBadgeClass, riskLabel } from "@/lib/risk";
import { Buyer } from "@/lib/types-insights";
import { isWatched, toggleWatch } from "@/lib/watchlist";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-3 text-2xl font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function verdict(b: Buyer) {
  const reasons: string[] = [];
  if (b.twoBidderShare >= 0.4) reasons.push(`У ${pct(b.twoBidderShare)} тендерів було рівно два учасники. Так часто виглядає схема «один виграє, другий формально програє».`);
  if (b.signals.repeatedPairs >= 3) reasons.push(`${b.signals.repeatedPairs} пар компаній приходили на торги цього замовника разом три і більше разів.`);
  if (b.signals.sanctionedSuppliers > 0) reasons.push(`${b.signals.sanctionedSuppliers} із постійних постачальників уже покарані Антимонопольним комітетом за змову.`);
  if (b.signals.highRiskSuppliers > 0) reasons.push(`${b.signals.highRiskSuppliers} постачальників мають історію торгів, дуже схожу на покараних.`);
  if (b.singleBidderShare >= 0.5) reasons.push(`У ${pct(b.singleBidderShare)} тендерів був лише один учасник: конкуренції не було взагалі.`);
  const concerning = b.twoBidderShare >= 0.4 || b.signals.repeatedPairs >= 3 || b.signals.sanctionedSuppliers > 0;
  const title = concerning
    ? "Торги цього замовника варто перевірити уважніше"
    : reasons.length
      ? "Є окремі ознаки, але загалом торги виглядають звичайно"
      : "Ознак домовленостей на торгах цього замовника не видно";
  return { title, reasons, concerning };
}

export default function BuyerPage() {
  const { edrpou } = useParams<{ edrpou: string }>();
  const [data, setData] = useState<Buyer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    fetchJson<Buyer>(`/api/risk/buyer/${edrpou}`).then(setData).catch((e) => setError(String(e)));
    setWatched(isWatched("buyer", edrpou));
  }, [edrpou]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/risk/buyers" className="text-sm text-muted hover:text-ink">← До замовників</Link>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Замовника {edrpou} не знайдено серед тендерів у базі, або дані про замовників ще завантажуються.
        </p>
      </div>
    );
  }
  if (!data) return <p className="text-muted">Завантаження…</p>;

  const v = verdict(data);

  return (
    <div className="space-y-8">
      <Link href="/risk/buyers" className="text-sm text-muted hover:text-ink">← До замовників</Link>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Картка замовника</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{data.name ?? data.edrpou}</h1>
          <p className="mt-1 text-sm text-muted">
            ЄДРПОУ {data.edrpou} · {data.region ?? "область невідома"} · тендери з {date(data.firstTender)} по {date(data.lastTender)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWatched(toggleWatch({ type: "buyer", id: data.edrpou, name: data.name }))}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${watched ? "border-ink bg-ink text-canvas" : "border-line bg-white text-ink hover:bg-surface"}`}
        >
          {watched ? "★ Стежу" : "☆ Стежити"}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Тендерів зі ставками" value={num(data.tendersWithBids)} sub={`усього оголошено ${num(data.tenders)}`} />
        <Stat label="З одним учасником" value={pct(data.singleBidderShare)} sub="конкуренції не було" />
        <Stat label="Рівно два учасники" value={pct(data.twoBidderShare)} sub="мінімум, щоб торги відбулися" />
        <Stat label="Очікувана вартість разом" value={money(data.valueTotal)} sub="тендери зі ставками" />
      </div>

      <section className={`rounded-2xl border-2 p-6 ${v.concerning ? "border-red-300 bg-red-50/60" : "border-ink bg-white"}`}>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Простими словами</p>
        <h2 className="mt-1 text-2xl font-extrabold text-ink">{v.title}</h2>
        {v.reasons.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
            {v.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Учасники різні, постійних пар немає, покараних серед постачальників не знайдено.</p>
        )}
        <p className="mt-3 text-xs text-muted">Це підказка, з чого почати перевірку, а не висновок про порушення.</p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Хто постачає цьому замовнику</h2>
          <CsvButton filename={`postachalnyky-${data.edrpou}`} rows={data.suppliers.map((s) => ({ edrpou: s.edrpou, name: s.name, bids: s.bids, wins: s.wins, won_amount: Math.round(s.wonAmount), score: s.score?.toFixed(3) ?? "", sanctioned: s.label ? 1 : 0 }))} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-4">Компанія</th>
                <th className="py-2 pr-4">Брала участь</th>
                <th className="py-2 pr-4">Вигравала</th>
                <th className="py-2 pr-4">Сума перемог</th>
                <th className="py-2 pr-4">Схожість на покараних</th>
                <th className="py-2">Реєстр АМКУ</th>
              </tr>
            </thead>
            <tbody>
              {data.suppliers.map((s) => (
                <tr key={s.edrpou} className="border-t border-line">
                  <td className="py-2 pr-4">
                    <Link href={`/risk/company/${s.edrpou}`} className="font-semibold text-ink hover:text-accent">{s.name ?? s.edrpou}</Link>
                    <div className="font-mono text-xs text-muted">{s.edrpou}</div>
                  </td>
                  <td className="py-2 pr-4 font-mono">{num(s.bids)}</td>
                  <td className="py-2 pr-4 font-mono">{num(s.wins)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{money(s.wonAmount)}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(s.score)}`}>{riskLabel(s.score)}</span>
                  </td>
                  <td className="py-2 text-xs text-red-700">{s.label ? "уже покарана" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Постійні пари учасників на торгах цього замовника</h2>
        <p className="mb-3 text-xs text-muted">Пари компаній, які зустрічались на торгах саме цього замовника три і більше разів, і хто з них вигравав.</p>
        {data.repeatedPairs.length === 0 ? (
          <p className="text-sm text-muted">Таких пар немає.</p>
        ) : (
          <ul className="space-y-2">
            {data.repeatedPairs.map((p) => {
              const oneSided = (p.aWon === 0 && p.bWon >= 3) || (p.bWon === 0 && p.aWon >= 3);
              return (
                <li key={`${p.a}-${p.b}`} className={`rounded-xl border p-3 text-sm ${oneSided || p.labelA || p.labelB ? "border-red-200 bg-red-50" : "border-line bg-white"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/risk/company/${p.a}`} className="font-semibold text-ink hover:text-accent">{p.nameA ?? p.a}</Link>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${riskBadgeClass(p.scoreA)}`}>{riskLabel(p.scoreA)}</span>
                    {p.labelA && <span className="text-xs font-semibold text-red-700">покарана</span>}
                    <span className="text-muted">і</span>
                    <Link href={`/risk/company/${p.b}`} className="font-semibold text-ink hover:text-accent">{p.nameB ?? p.b}</Link>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${riskBadgeClass(p.scoreB)}`}>{riskLabel(p.scoreB)}</span>
                    {p.labelB && <span className="text-xs font-semibold text-red-700">покарана</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Зустрічались тут {p.shared} разів. Перша вигравала {p.aWon}, друга {p.bWon}.
                    {oneSided ? " Одна з них не виграла жодного разу: так виглядає прикриття." : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Останні тендери</h2>
        <ul className="divide-y divide-line text-sm">
          {data.recentTenders.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <Link href={`/risk/tender/${t.tenderID ?? t.id}`} className="font-semibold text-ink hover:text-accent">{t.title ?? t.tenderID ?? `#${t.id}`}</Link>
                <div className="truncate text-xs text-muted">{date(t.datePublished)} · {t.tenderID} · переможець: {t.winner ?? "—"}</div>
              </div>
              <div className="text-right text-xs">
                <div>{money(t.valueAmount)}</div>
                <div className="text-muted">{t.bidders} учасн.{t.winnerScore !== null && t.winnerScore >= 0.7 ? <span className="ml-1 font-semibold text-red-700">· переможець високого ризику</span> : null}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
