"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/lib/api";
import { date, num } from "@/lib/risk";
import { Backtest, BacktestList } from "@/lib/types";

const pct0 = (v: number) => `${Math.round(v * 100)} %`;

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-canvas">{n}</div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

function Timeline({ year }: { year: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-stretch overflow-hidden rounded-xl text-xs font-semibold">
        <div className="flex-1 bg-slate-200 px-3 py-2 text-slate-800">
          Модель бачить: тендери і рішення АМКУ до 31.12.{year}
        </div>
        <div className="w-1 bg-ink" />
        <div className="flex-1 bg-red-100 px-3 py-2 text-red-900">
          Модель не бачить: рішення АМКУ {year + 1}–2026. Ними перевіряємо
        </div>
      </div>
    </div>
  );
}

/** 10×10 dots: the top-100 list, red = later sanctioned, grey = no decision yet. */
function HitGrid({ outcomes }: { outcomes: string[] }) {
  return (
    <div className="grid grid-cols-10 gap-1.5" style={{ maxWidth: 260 }}>
      {outcomes.slice(0, 100).map((o, i) => (
        <div key={i} title={`місце ${i + 1}: ${o === "caught" ? "покарана пізніше" : "без рішення"}`}
             className={`aspect-square rounded-sm ${o === "caught" ? "bg-red-600" : "bg-slate-200"}`} />
      ))}
    </div>
  );
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
      {curve.map((c) => <text key={c.k} x={x(c.k)} y={h - 8} textAnchor="middle" fontSize="11" fill="#6b7280">{c.k}</text>)}
      <line x1={pad.l} x2={w - pad.r} y1={y(baseRate)} y2={y(baseRate)} stroke="#6b7280" strokeDasharray="4 4" />
      <text x={w - pad.r} y={y(baseRate) - 4} textAnchor="end" fontSize="11" fill="#6b7280">якби обирали навмання: {pct0(baseRate)}</text>
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
  const [showAllCaught, setShowAllCaught] = useState(false);

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
    fetchJson<Backtest>(`/api/risk/backtest/${year}?limit=${Math.max(limit, 100)}&fullCoverageOnly=${fullOnly ? 1 : 0}`)
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [year, limit, fullOnly]);

  const p100 = useMemo(() => data?.curve.find((c) => c.k === 100), [data]);
  const hits100 = useMemo(() => (data ? data.top.slice(0, 100).filter((t) => t.outcome === "caught").length : 0), [data]);
  const caughtSorted = useMemo(() => (data ? [...data.caughtLater].sort((a, b) => a.rankUsed - b.rankUsed) : []), [data]);
  const inTop100 = caughtSorted.filter((c) => c.rankUsed <= 100).length;
  const inTop10pct = data ? Math.round(data.recallTop10Pct * data.totalCaught) : 0;

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Перевірка на минулому</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Чи вгадує модель, кого АМКУ покарає далі?</h1>
        <p className="max-w-3xl text-base text-muted">
          Ми «відмотуємо час назад»: даємо моделі лише те, що було відомо на кінець обраного року, просимо скласти
          список підозрілих компаній, а потім звіряємо його з рішеннями АМКУ, які вийшли пізніше.
        </p>
      </header>

      <section className="grid gap-5 rounded-2xl border border-line bg-surface p-5 md:grid-cols-3">
        <Step n={1} title="Відмотали час" text="Беремо тендери до 31 грудня обраного року і компанії, яких АМКУ вже покарав на той момент. Усе пізніше приховано." />
        <Step n={2} title="Модель склала список" text="Вона навчилась на відомих покараних і поставила кожній компанії без рішення число ризику. Сортуємо від найбільшого." />
        <Step n={3} title="Звірили з життям" text="Дивимось у сьогоднішній реєстр: скільком компаніям з верхівки списку АМКУ справді виніс рішення пізніше." />
      </section>

      {list && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Кінець року
            <select value={year ?? ""} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1">
              {list.items.map((i) => <option key={i.cutoffYear} value={i.cutoffYear}>{i.cutoffYear}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={fullOnly} onChange={(e) => setFullOnly(e.target.checked)} />
            чесне порівняння (лише компанії з повною історією)
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

      {data && year && (
        <>
          <Timeline year={year} />

          <section className="rounded-2xl border-2 border-ink bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Головний результат</p>
            <p className="mt-2 text-2xl font-extrabold leading-snug text-ink">
              Зі 100 компаній, які модель поставила на верх списку наприкінці {year} року,{" "}
              <span className="text-red-700">{hits100} отримали рішення АМКУ</span> у {year + 1}–2026 роках.
            </p>
            <p className="mt-2 text-base text-muted">
              Якби ті ж 100 компаній обирали навмання з того самого списку, покараних було б близько{" "}
              <b>{Math.round(data.baseRate * 100)}</b>. Отже список моделі у{" "}
              <b>{p100 ? p100.lift.toFixed(1) : "—"} раза</b> точніший за випадковий вибір.
            </p>
            <div className="mt-5 flex flex-wrap items-start gap-8">
              <div>
                <HitGrid outcomes={data.top.map((t) => t.outcome)} />
                <p className="mt-2 text-xs text-muted">Кожен квадрат — одна компанія з топ-100. <span className="font-semibold text-red-700">Червона</span> — покарана пізніше.</p>
              </div>
              <dl className="grid gap-3 text-sm">
                <div><dt className="text-muted">Компаній без рішення на кінець {year}</dt><dd className="text-xl font-bold text-ink">{num(data.population)}</dd></div>
                <div><dt className="text-muted">З них АМКУ покарав пізніше</dt><dd className="text-xl font-bold text-ink">{num(data.totalCaught)} <span className="text-sm font-normal text-muted">({pct0(data.baseRate)})</span></dd></div>
                <div><dt className="text-muted">Скільки з покараних пізніше стояли у верхніх 10 % списку</dt><dd className="text-xl font-bold text-ink">{num(inTop10pct)} <span className="text-sm font-normal text-muted">({pct0(data.recallTop10Pct)})</span></dd></div>
              </dl>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold text-ink">Що буде, якщо перевіряти більше компаній</h2>
            <p className="mb-3 text-sm text-muted">
              Аудитор має час на k перевірок. Лінія показує, яка частка з перших k компаній списку виявилась покараною.
              Чим далі вниз списком, тим менше влучань, але все одно вище за пунктир випадкового вибору.
            </p>
            <PrecisionChart curve={data.curve} baseRate={data.baseRate} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr><th className="py-1 pr-3">Перевірили компаній</th>{data.curve.map((c) => <th key={c.k} className="py-1 pr-3 font-mono">{c.k}</th>)}</tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line"><td className="py-1 pr-3">з них покарано пізніше</td>{data.curve.map((c) => <td key={c.k} className="py-1 pr-3 font-mono">{pct0(c.precision)}</td>)}</tr>
                  <tr className="border-t border-line"><td className="py-1 pr-3">яку частку всіх майбутніх покараних знайшли</td>{data.curve.map((c) => <td key={c.k} className="py-1 pr-3 font-mono">{pct0(c.recall)}</td>)}</tr>
                  <tr className="border-t border-line"><td className="py-1 pr-3">у скільки разів краще за навмання</td>{data.curve.map((c) => <td key={c.k} className="py-1 pr-3 font-mono">×{c.lift.toFixed(1)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-base font-bold text-ink">Список моделі на 31.12.{year}</h2>
              <p className="mb-3 text-sm text-muted">Хто стояв на верху, і що з ним сталося потім.</p>
              <div className="mb-2 flex items-center gap-2 text-xs">
                показати
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded border border-line bg-white px-2 py-0.5">
                  {[50, 100, 200, 500].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface text-left text-xs uppercase text-muted">
                    <tr><th className="py-2 pr-2">Місце</th><th className="py-2 pr-2">Компанія</th><th className="py-2 pr-2">Тендерів</th><th className="py-2">Що сталося</th></tr>
                  </thead>
                  <tbody>
                    {data.top.slice(0, limit).map((t) => (
                      <tr key={t.edrpou} className={`border-t border-line ${t.outcome === "caught" ? "bg-red-50/70" : ""}`}>
                        <td className="py-2 pr-2 font-mono text-xs">{t.rankUsed}</td>
                        <td className="py-2 pr-2">
                          <Link href={`/risk/company/${t.edrpou}`} className="font-semibold text-ink hover:text-accent">{t.name || t.edrpou}</Link>
                          <div className="font-mono text-xs text-muted">{t.edrpou}</div>
                        </td>
                        <td className="py-2 pr-2 font-mono">{num(t.nTenders)}</td>
                        <td className="py-2 text-xs">
                          {t.outcome === "caught"
                            ? <span className="font-semibold text-red-700">✔ АМКУ покарав {t.firstDecision ? date(t.firstDecision) : ""}</span>
                            : <span className="text-muted">рішення поки немає</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-base font-bold text-ink">Кого АМКУ покарав після {year} року</h2>
              <p className="mb-3 text-sm text-muted">
                Усього {num(data.totalCaught)} компаній. Де кожна з них стояла в списку моделі: {num(inTop100)} були в топ-100,{" "}
                {num(inTop10pct)} у верхніх 10 %. Смужка — наскільки високо: повна смужка = сама верхівка.
              </p>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface text-left text-xs uppercase text-muted">
                    <tr><th className="py-2 pr-2">Місце у списку</th><th className="py-2 pr-2">Наскільки високо</th><th className="py-2 pr-2">Компанія</th><th className="py-2">Дата рішення</th></tr>
                  </thead>
                  <tbody>
                    {(showAllCaught ? caughtSorted : caughtSorted.slice(0, 200)).map((c) => (
                      <tr key={c.edrpou} className="border-t border-line">
                        <td className="py-2 pr-2 font-mono text-xs">{c.rankUsed} з {num(data.population)}</td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded bg-line"><div className="h-2 rounded bg-red-600" style={{ width: `${Math.max(2, c.percentile ?? 0)}%` }} /></div>
                            <span className="text-xs text-muted">{c.percentile === null || c.percentile === undefined ? "—" : `вище за ${Math.round(c.percentile)} % компаній`}</span>
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
                {!showAllCaught && caughtSorted.length > 200 && (
                  <button onClick={() => setShowAllCaught(true)} className="mt-3 text-sm font-semibold text-accent">показати всі {num(caughtSorted.length)}</button>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
            <p className="font-semibold text-ink">Як читати ці числа чесно</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Список порівнює покараних згодом з компаніями без рішення, які мають таку ж повну історію торгів. Тому «навмання» тут дає {pct0(data.baseRate)}, а не частку змовників на всьому ринку.</li>
              <li>«Рішення поки немає» не означає «чесна». АМКУ перевіряє малу частку ринку, частина цих компаній може бути покарана в майбутньому.</li>
              <li>Модель добре відбирає верхівку списку, але більшість майбутніх покараних стоїть у середині. Це інструмент пріоритезації перевірок, не доказ.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
