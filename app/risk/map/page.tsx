"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import RiskMap, { METRICS, MapMetric } from "@/components/RiskMap";
import { fetchJson } from "@/lib/api";
import { num, pct, riskBadgeClass, riskLabel } from "@/lib/risk";
import { RiskRanking, RiskRegions } from "@/lib/types";

export default function RiskMapPage() {
  const [data, setData] = useState<RiskRegions | null>(null);
  const [metric, setMetric] = useState<MapMetric>("highRiskShare");
  const [minTenders, setMinTenders] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [top, setTop] = useState<RiskRanking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    fetchJson<RiskRegions>(`/api/risk/regions?minTenders=${minTenders}`).then(setData).catch((e) => setError(String(e)));
  }, [minTenders]);

  useEffect(() => {
    if (!selected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTop(null);
      return;
    }
    const params = new URLSearchParams({ limit: "15", minTenders: String(minTenders), excludeKnown: "1", region: selected });
    fetchJson<RiskRanking>(`/api/risk/ranking?${params}`).then(setTop).catch(() => setTop(null));
  }, [selected, minTenders]);

  const rows = data ? [...data.regions].sort((a, b) => (b[metric] as number) - (a[metric] as number)) : [];

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Мапа ризику</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Ризик змови за областями</h1>
        <p className="max-w-3xl text-sm text-muted">
          Компанії віднесено до області за адресою реєстрації у картці учасника Prozorro. Колір показує обраний
          показник; клік по області відкриває її найризиковіші компанії, які ще не потрапили до реєстру АМКУ.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Показник
          <select value={metric} onChange={(e) => setMetric(e.target.value as MapMetric)} className="rounded-lg border border-line bg-white px-2 py-1">
            {(Object.keys(METRICS) as MapMetric[]).map((m) => (
              <option key={m} value={m}>{METRICS[m].label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          мін. тендерів у компанії
          <select value={minTenders} onChange={(e) => setMinTenders(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1">
            {[5, 10, 20, 50].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <span className="text-xs text-muted">{METRICS[metric].hint}</span>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {data ? <RiskMap regions={data.regions} metric={metric} selected={selected} onSelect={setSelected} /> : <p className="text-muted">Завантаження мапи…</p>}
        </div>
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Області за показником</h2>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.region}
                      onClick={() => setSelected(selected === r.region ? null : r.region)}
                      className={`cursor-pointer border-t border-line hover:bg-white ${selected === r.region ? "bg-white font-semibold" : ""}`}
                    >
                      <td className="py-1.5 pr-2 text-muted">{i + 1}</td>
                      <td className="py-1.5 pr-2">{r.region}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{METRICS[metric].format(r[metric] as number)}</td>
                      <td className="py-1.5 text-right text-xs text-muted">{num(r.companies)} комп.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {selected && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{selected}: найризиковіші компанії поза реєстром АМКУ</h2>
            <Link href={`/risk?region=${encodeURIComponent(selected)}`} className="text-sm text-accent hover:underline">повний рейтинг області →</Link>
          </div>
          {!top ? (
            <p className="mt-2 text-sm text-muted">Завантаження…</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="py-2 pr-4">Компанія</th><th className="py-2 pr-4">Ризик</th><th className="py-2 pr-4">Тендерів</th><th className="py-2">Перемог</th></tr>
              </thead>
              <tbody>
                {top.items.map((c) => (
                  <tr key={c.edrpou} className="border-t border-line">
                    <td className="py-2 pr-4">
                      <Link href={`/risk/company/${c.edrpou}`} className="font-semibold text-ink hover:text-accent">{c.name ?? c.edrpou}</Link>
                      <div className="text-xs text-muted">{c.edrpou}</div>
                    </td>
                    <td className="py-2 pr-4"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(c.score)}`}>{pct(c.score)} · {riskLabel(c.score)}</span></td>
                    <td className="py-2 pr-4">{num(c.nTenders)}</td>
                    <td className="py-2">{num(c.nWon)} <span className="text-muted">({pct(c.winRate)})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <p className="text-xs text-muted">
        Показники агреговані по компаніях з мінімальною кількістю тендерів; області з малою кількістю компаній
        дають нестабільні частки. Тимчасово окуповані території відображаються за адресами реєстрації у картках
        і можуть бути неповними. Це підказка для пріоритезації, а не оцінка регіону.
      </p>
    </div>
  );
}
