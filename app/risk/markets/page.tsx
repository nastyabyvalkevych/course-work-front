"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { cpvName } from "@/lib/cpv";
import { num } from "@/lib/risk";
import { MarketsResponse, MoneyResponse } from "@/lib/types";

const pct0 = (v: number) => `${Math.round(v * 100)} %`;
const uah = (v: number) =>
  v >= 1e9 ? `${(v / 1e9).toFixed(1).replace(".", ",")} млрд ₴` : v >= 1e6 ? `${(v / 1e6).toFixed(0)} млн ₴` : `${new Intl.NumberFormat("uk-UA").format(Math.round(v))} ₴`;

function Bars({ items }: { items: MoneyResponse["items"] }) {
  const w = 640, h = 220, pad = { l: 60, r: 12, t: 12, b: 28 };
  const max = Math.max(...items.map((i) => i.wonTotal), 1);
  const bw = (w - pad.l - pad.r) / items.length;
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={w - pad.r} y1={y(f * max)} y2={y(f * max)} stroke="#e5e7eb" />
          <text x={pad.l - 6} y={y(f * max) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{uah(f * max)}</text>
        </g>
      ))}
      {items.map((it, i) => {
        const x = pad.l + i * bw + bw * 0.15;
        const bwI = bw * 0.7;
        return (
          <g key={it.key ?? i}>
            <rect x={x} y={y(it.wonTotal)} width={bwI} height={y(0) - y(it.wonTotal)} fill="#cbd5e1" />
            <rect x={x} y={y(it.wonHighRisk)} width={bwI} height={y(0) - y(it.wonHighRisk)} fill="#dc2626" />
            <text x={x + bwI / 2} y={h - 8} textAnchor="middle" fontSize="11" fill="#6b7280">{it.key}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketsResponse | null>(null);
  const [byYear, setByYear] = useState<MoneyResponse | null>(null);
  const [byRegion, setByRegion] = useState<MoneyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<MarketsResponse>("/api/risk/markets?minTenders=200").then(setMarkets).catch((e) => setError(String(e)));
    fetchJson<MoneyResponse>("/api/risk/money?by=year").then(setByYear).catch(() => setByYear({ by: "year", items: [] }));
    fetchJson<MoneyResponse>("/api/risk/money?by=region").then(setByRegion).catch(() => setByRegion({ by: "region", items: [] }));
  }, []);

  const rows = markets ? [...markets.items].sort((a, b) => b.wonHighRisk - a.wonHighRisk) : [];
  const maxShare = Math.max(...rows.map((r) => r.highRiskShareMoney), 0.01);
  const years = byYear ? byYear.items.filter((i) => i.key && Number(i.key) >= 2016 && Number(i.key) <= 2026) : [];
  const regions = byRegion ? [...byRegion.items].filter((i) => i.key).sort((a, b) => b.highRiskShare - a.highRiskShare) : [];
  const totalHigh = years.reduce((a, i) => a + i.wonHighRisk, 0);
  const totalAll = years.reduce((a, i) => a + i.wonTotal, 0);

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Ринки і гроші</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">На чому найчастіше домовляються</h1>
        <p className="max-w-3xl text-base text-muted">
          Кожен тендер має код того, що купують: ліки, дороги, харчування, паливо. Тут видно, на яких ринках
          компанії з високим ризиком забирають найбільше грошей, і скільки це в гривнях по роках та областях.
          Високий ризик означає «історія торгів дуже схожа на історії покараних компаній», а не вирок. Серед великих
          постачальників таких компаній багато, тому частки грошей виглядають великими: порівнюйте ринки між собою,
          а не читайте частку як «частку змов».
        </p>
      </header>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {years.length > 0 && (
        <section className="rounded-2xl border-2 border-ink bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Головна цифра</p>
          <p className="mt-2 text-2xl font-extrabold leading-snug text-ink">
            Компанії з високим ризиком виграли тендерів на <span className="text-red-700">{uah(totalHigh)}</span> з {uah(totalAll)} у нашій базі.
          </p>
          <p className="mt-2 text-sm text-muted">Це {pct0(totalAll ? totalHigh / totalAll : 0)} усіх грошей за перемогами, які ми бачимо. Сума перемог — ціна, за яку компанія виграла, без урахування змін договору.</p>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-bold text-ink">Ринки</h2>
        <p className="mb-3 text-sm text-muted">Відсортовано за сумою, яку виграли компанії високого ризику. Смужка — яка частка грошей ринку пішла таким компаніям.</p>
        {!markets ? (
          <p className="text-sm text-muted">Завантаження…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Дані по ринках ще рахуються. Зайдіть трохи пізніше.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-3">Ринок</th>
                  <th className="py-2 pr-3">Тендерів</th>
                  <th className="py-2 pr-3">Постачальників</th>
                  <th className="py-2 pr-3">З них високого ризику</th>
                  <th className="py-2 pr-3">Покараних</th>
                  <th className="py-2 pr-3">Сума перемог</th>
                  <th className="py-2 pr-3">З них у компаній високого ризику</th>
                  <th className="py-2">Тендерів «удвох»</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cpv} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-ink">{cpvName(r.cpv)}</div>
                      <div className="font-mono text-xs text-muted">код {r.cpv}</div>
                    </td>
                    <td className="py-2 pr-3 font-mono">{num(r.tenders)}</td>
                    <td className="py-2 pr-3 font-mono">{num(r.suppliers)}</td>
                    <td className="py-2 pr-3 font-mono">{num(r.highRiskSuppliers)} <span className="text-xs text-muted">({pct0(r.highRiskSupplierShare)})</span></td>
                    <td className="py-2 pr-3 font-mono">{num(r.sanctionedSuppliers)}</td>
                    <td className="py-2 pr-3 font-mono">{uah(r.wonTotal)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded bg-line"><div className="h-2 rounded bg-red-600" style={{ width: `${(r.highRiskShareMoney / maxShare) * 100}%` }} /></div>
                        <span className="font-mono text-xs">{uah(r.wonHighRisk)} · {pct0(r.highRiskShareMoney)}</span>
                      </div>
                    </td>
                    <td className="py-2 font-mono">{pct0(r.twoBidderShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-bold text-ink">Гроші по роках</h2>
          <p className="mb-3 text-sm text-muted">Сірий стовпчик — усі перемоги за рік, червоний — перемоги компаній високого ризику.</p>
          {!byYear ? <p className="text-sm text-muted">Завантаження…</p> : years.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Дані ще рахуються.</p>
          ) : (
            <>
              <Bars items={years} />
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1 pr-3">Рік</th><th className="py-1 pr-3">Усі перемоги</th><th className="py-1 pr-3">Високий ризик</th><th className="py-1">Частка</th></tr></thead>
                <tbody>
                  {years.map((i) => (
                    <tr key={i.key} className="border-t border-line"><td className="py-1 pr-3 font-mono">{i.key}</td><td className="py-1 pr-3 font-mono">{uah(i.wonTotal)}</td><td className="py-1 pr-3 font-mono text-red-700">{uah(i.wonHighRisk)}</td><td className="py-1 font-mono">{pct0(i.highRiskShare)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-bold text-ink">Гроші по областях замовників</h2>
          <p className="mb-3 text-sm text-muted">Область — де зареєстрований замовник, а не постачальник. Відсортовано за часткою грошей у компаній високого ризику.</p>
          {!byRegion ? <p className="text-sm text-muted">Завантаження…</p> : regions.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Дані ще рахуються.</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-left text-xs uppercase text-muted"><tr><th className="py-1 pr-3">Область</th><th className="py-1 pr-3">Усі перемоги</th><th className="py-1 pr-3">Високий ризик</th><th className="py-1">Частка</th></tr></thead>
                <tbody>
                  {regions.map((i) => (
                    <tr key={i.key} className="border-t border-line"><td className="py-1 pr-3">{i.key}</td><td className="py-1 pr-3 font-mono">{uah(i.wonTotal)}</td><td className="py-1 pr-3 font-mono text-red-700">{uah(i.wonHighRisk)}</td><td className="py-1 font-mono">{pct0(i.highRiskShare)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p className="text-xs text-muted">
        Суми — ціни перемог у тендерах з нашої бази, а не всі закупівлі країни. «Високий ризик» — оцінка від 70 %.
        Гроші у компаній високого ризику не означають, що їх украли: це сума, яку варто перевіряти першою.
      </p>
    </div>
  );
}
