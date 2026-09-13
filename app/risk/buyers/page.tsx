"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CsvButton from "@/components/CsvButton";
import { fetchJson } from "@/lib/api";
import { money, num, pct } from "@/lib/risk";
import { BuyerList, REGION_LIST } from "@/lib/types-insights";

export default function BuyersPage() {
  const [region, setRegion] = useState("");
  const [minTenders, setMinTenders] = useState(20);
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [data, setData] = useState<BuyerList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    const p = new URLSearchParams({ limit: "100", minTenders: String(minTenders) });
    if (region) p.set("region", region);
    if (submittedQ) p.set("q", submittedQ);
    fetchJson<BuyerList>(`/api/risk/buyers?${p}`).then(setData).catch((e) => setError(String(e)));
  }, [region, minTenders, submittedQ]);

  const rows = data?.items ?? [];

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Замовники</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">У кого на торгах найменше конкуренції</h1>
        <p className="max-w-3xl text-sm text-muted">
          Часто змова живе навколо конкретного замовника: ті самі дві-три компанії приходять на його торги роками, і виграє
          завжди одна з них. Тут замовники відсортовані за часткою тендерів, де було рівно два учасники.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQ(q.trim());
        }}
        className="flex flex-wrap items-center gap-4 text-sm"
      >
        <label className="flex items-center gap-2">
          Область
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">
            <option value="">усі</option>
            {REGION_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          мін. тендерів
          <select value={minTenders} onChange={(e) => setMinTenders(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1">
            {[10, 20, 50, 100].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Назва або код замовника" className="rounded-lg border border-line bg-white px-3 py-1" />
          <button className="rounded-lg bg-ink px-3 py-1 font-semibold text-canvas hover:bg-accent">Знайти</button>
        </div>
        <CsvButton
          filename="zamovnyky"
          rows={rows.map((r) => ({
            edrpou: r.edrpou, name: r.name, region: r.region, tenders: r.tenders,
            single_bidder_share: r.singleBidderShare.toFixed(3), two_bidder_share: r.twoBidderShare.toFixed(3),
            high_risk_wins: r.highRiskWins, sanctioned_wins: r.sanctionedWins, won_total: Math.round(r.wonTotal), won_high_risk: Math.round(r.wonHighRisk),
          }))}
        />
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {data && rows.length === 0 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Дані про замовників ще завантажуються або нічого не знайдено за цими фільтрами. Спробуйте зменшити мінімум тендерів.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Замовник</th>
                <th className="px-3 py-3">Область</th>
                <th className="px-3 py-3">Тендерів</th>
                <th className="px-3 py-3">З одним учасником</th>
                <th className="px-3 py-3">«Удвох»</th>
                <th className="px-3 py-3">Перемог компаній високого ризику</th>
                <th className="px-3 py-3">Перемог покараних</th>
                <th className="px-3 py-3">Сума перемог</th>
                <th className="px-3 py-3">З них у високого ризику</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.edrpou} className="border-t border-line hover:bg-white">
                  <td className="px-4 py-2">
                    <Link href={`/risk/buyer/${r.edrpou}`} className="font-semibold text-ink hover:text-accent">{r.name || r.edrpou}</Link>
                    <div className="font-mono text-xs text-muted">{r.edrpou}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{r.region ?? "—"}</td>
                  <td className="px-3 py-2 font-mono">{num(r.tenders)}</td>
                  <td className="px-3 py-2 font-mono">{pct(r.singleBidderShare)}</td>
                  <td className={`px-3 py-2 font-mono ${r.twoBidderShare >= 0.4 ? "font-bold text-red-700" : ""}`}>{pct(r.twoBidderShare)}</td>
                  <td className="px-3 py-2 font-mono">{num(r.highRiskWins)}</td>
                  <td className={`px-3 py-2 font-mono ${r.sanctionedWins > 0 ? "text-red-700" : ""}`}>{num(r.sanctionedWins)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{money(r.wonTotal)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{money(r.wonHighRisk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
