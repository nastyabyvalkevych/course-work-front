"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/lib/api";
import { date, num, pct } from "@/lib/risk";
import { Backtest, BacktestList } from "@/lib/types";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-3 text-3xl font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Outcome({ o, firstDecision }: { o: string; firstDecision: string | null }) {
  if (o === "caught")
    return <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">покарана {firstDecision ? date(firstDecision) : ""}</span>;
  if (o === "known") return <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted">вже в реєстрі</span>;
  return <span className="rounded-full border border-line bg-white px-2 py-0.5 text-xs text-muted">без рішення</span>;
}

function PrecisionChart({ curve, baseRate }: { curve: Backtest["curve"]; baseRate: number }) {
  const w = 640, h = 220, pad = { l: 44, r: 12, t: 12, b: 28 };
  if (!curve.length) return null;
  const maxK = curve[curve.length - 1].k;
  const x = (k: number) => pad.l + (Math.log10(k) / Math.log10(maxK)) * (w - pad.l - pad.r);
  const y = (p: number) => pad.t + (1 - p) * (h - pad.t - pad.b);
  const d = curve.map((c, i) => `${i ? "L" : "M"}${x(c.k).toFixed(1)},${y(c.precision).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{Math.round(t * 100)} %</text>
        </g>
      ))}
      {curve.map((c) => (
        <text key={c.k} x={x(c.k)} y={h - 8} textAnchor="middle" fontSize="11" fill="#6b7280">{c.k}</text>
      ))}
      <line x1={pad.l} x2={w - pad.r} y1={y(baseRate)} y2={y(baseRate)} stroke="#6b7280" strokeDasharray="4 4" />
      <text x={w - pad.r} y={y(baseRate) - 4} textAnchor="end" fontSize="11" fill="#6b7280">випадковий відбір {Math.round(baseRate * 100)} %</text>
      <path d={d} fill="none" stroke="#dc2626" strokeWidth="2.5" />
      {curve.map((c) => <circle key={c.k} cx={x(c.k)} cy={y(c.precision)} r="3.5" fill="#dc2626" />)}
    </svg>
  );
}

export default function BacktestPage() {
  const [list, setList] = useState<BacktestList | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [fullOnly, setFullOnly] = useState(true);
  const [limit, setLimit] = useState(100);
  const [data, setData] = useState<Backtest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<BacktestList>("/api/risk/backtest")
      .then((l) => {
        setList(l);
        if (l.items.length) setYear(l.items[l.items.length - 1].cutoffYear);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!year) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    fetchJson<Backtest>(`/api/risk/backtest/${year}?limit=${limit}&fullCoverageOnly=${fullOnly ? 1 : 0}`)
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [year, limit, fullOnly]);

  const p100 = useMemo(() => data?.curve.find((c) => c.k === 100), [data]);
  const caughtSorted = useMemo(() => (data ? [...data.caughtLater].sort((a, b) => a.rankUsed - b.rankUsed) : []), [data]);

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Ретроспективна перевірка</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Що система сказала б наприкінці року, і кого АМКУ покарав потім</h1>
        <p className="max-w-3xl text-sm text-muted">
          Модель навчена лише на тендерах до 31 грудня обраного року і на рішеннях АМКУ, відомих на той момент.
          Потім дивимось у сьогоднішній реєстр: чи справді компанії з верхівки її списку отримали рішення в наступні роки.
          Компанії, які вже були в реєстрі на дату зрізу, зі списку прибрано.
        </p>
      </header>

      {list && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Зріз
            <select value={year ?? ""} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1">
              {list.items.map((i) => <option key={i.cutoffYear} value={i.cutoffYear}>31.12.{i.cutoffYear}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            показати топ
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1">
              {[50, 100, 200, 500].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={fullOnly} onChange={(e) => setFullOnly(e.target.checked)} />
            лише компанії з повною історією (чесне порівняння)
          </label>
        </div>
      )}
      {!fullOnly && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Увага: компанії з неповною історією потрапили в дані лише через тендери з покараними, тому їхні оцінки не порівнювані з
          повними. Ці числа завищують якість і наведені тільки для ілюстрації упередження відбору.
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Компаній без рішення на дату зрізу" value={num(data.population)} sub={`з них покарано пізніше: ${num(data.totalCaught)}`} />
            <Stat label="Випадковий відбір" value={pct(data.baseRate, 1)} sub="частка покараних пізніше серед усіх" />
            <Stat label="Точність у топ-100" value={p100 ? pct(p100.precision, 0) : "—"} sub={p100 ? `у ${p100.lift.toFixed(1)} раза краще за випадковий` : undefined} />
            <Stat label="Спіймано в топ-10 %" value={pct(data.recallTop10Pct, 0)} sub="частка покараних пізніше, яких модель поставила у верхні 10 %" />
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Точність за розміром списку перевірок</h2>
            <p className="mb-3 text-xs text-muted">Якби аудитор перевірив перших k компаній зі списку моделі, яка частка з них отримала рішення АМКУ в наступні роки.</p>
            <PrecisionChart curve={data.curve} baseRate={data.baseRate} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left uppercase text-muted">
                  <tr><th className="py-1 pr-3">k</th>{data.curve.map((c) => <th key={c.k} className="py-1 pr-3 font-mono">{c.k}</th>)}</tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line"><td className="py-1 pr-3">точність</td>{data.curve.map((c) => <td key={c.k} className="py-1 pr-3 font-mono">{pct(c.precision, 0)}</td>)}</tr>
                  <tr className="border-t border-line"><td className="py-1 pr-3">повнота</td>{data.curve.map((c) => <td key={c.k} className="py-1 pr-3 font-mono">{pct(c.recall, 0)}</td>)}</tr>
                  <tr className="border-t border-line"><td className="py-1 pr-3">приріст</td>{data.curve.map((c) => <td key={c.k} className="py-1 pr-3 font-mono">×{c.lift.toFixed(1)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Прогноз: верхівка списку на 31.12.{data.cutoffYear}</h2>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface text-left text-xs uppercase text-muted">
                    <tr><th className="py-2 pr-2">#</th><th className="py-2 pr-2">Компанія</th><th className="py-2 pr-2">Ризик</th><th className="py-2 pr-2">Тендерів</th><th className="py-2">Дійсність</th></tr>
                  </thead>
                  <tbody>
                    {data.top.map((t) => (
                      <tr key={t.edrpou} className={`border-t border-line ${t.outcome === "caught" ? "bg-red-50/60" : ""}`}>
                        <td className="py-2 pr-2 font-mono text-xs">{t.rankUsed}</td>
                        <td className="py-2 pr-2">
                          <Link href={`/risk/company/${t.edrpou}`} className="font-semibold text-ink hover:text-accent">{t.name || t.edrpou}</Link>
                          <div className="font-mono text-xs text-muted">{t.edrpou}</div>
                        </td>
                        <td className="py-2 pr-2 font-mono">{t.score.toFixed(3)}</td>
                        <td className="py-2 pr-2 font-mono">{num(t.nTenders)}</td>
                        <td className="py-2"><Outcome o={t.outcome} firstDecision={t.firstDecision} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Дійсність: кого АМКУ покарав після зрізу</h2>
              <p className="mb-3 text-xs text-muted">Де ці компанії стояли в списку моделі на дату зрізу. Перцентиль 99 означає «у верхньому 1 %».</p>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface text-left text-xs uppercase text-muted">
                    <tr><th className="py-2 pr-2">Місце</th><th className="py-2 pr-2">Перцентиль</th><th className="py-2 pr-2">Компанія</th><th className="py-2">Рішення</th></tr>
                  </thead>
                  <tbody>
                    {caughtSorted.map((c) => (
                      <tr key={c.edrpou} className="border-t border-line">
                        <td className="py-2 pr-2 font-mono text-xs">{c.rankUsed}</td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded bg-line"><div className="h-2 rounded bg-red-600" style={{ width: `${Math.max(2, c.percentile ?? 0)}%` }} /></div>
                            <span className="font-mono text-xs">{c.percentile === null || c.percentile === undefined ? "—" : c.percentile.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-2">
                          <Link href={`/risk/company/${c.edrpou}`} className="font-semibold text-ink hover:text-accent">{c.name || c.edrpou}</Link>
                          <div className="font-mono text-xs text-muted">{c.edrpou}</div>
                        </td>
                        <td className="py-2 text-xs">{c.firstDecision ? date(c.firstDecision) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
