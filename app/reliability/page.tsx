"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/lib/api";
import { Skeleton, Stat } from "@/components/ui";
import { num } from "@/lib/risk";
import { ReliabilityProfile, ReliabilityReport } from "@/lib/types";

const HORIZONS = [1, 24, 168, 720];

const fmtR = (v: number, digits = 4) => v.toFixed(digits);
const fmtPct = (v: number, digits = 2) => `${(v * 100).toFixed(digits)} %`;
const fmtHours = (h: number) =>
  !Number.isFinite(h) ? "∞" : h >= 48 ? `${(h / 24).toFixed(1)} діб` : `${h.toFixed(1)} год`;


function Curve({ curve, horizon }: { curve: { hours: number; reliability: number }[]; horizon: number }) {
  const w = 640;
  const h = 220;
  const pad = { l: 44, r: 12, t: 12, b: 28 };
  const min = Math.min(...curve.map((c) => c.reliability));
  const y0 = Math.max(0, Math.floor(min * 20) / 20 - 0.05);
  const x = (t: number) => pad.l + (t / horizon) * (w - pad.l - pad.r);
  const y = (r: number) => pad.t + (1 - (r - y0) / (1 - y0)) * (h - pad.t - pad.b);
  const d = curve.map((c, i) => `${i ? "L" : "M"}${x(c.hours).toFixed(1)},${y(c.reliability).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => y0 + f * (1 - y0));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{t.toFixed(3)}</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text key={f} x={x(f * horizon)} y={h - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
          {fmtHours(f * horizon)}
        </text>
      ))}
      <path d={d} fill="none" stroke="#dc2626" strokeWidth="2.5" />
    </svg>
  );
}

export default function ReliabilityPage() {
  const [horizon, setHorizon] = useState(24);
  const [live, setLive] = useState(true);
  const [report, setReport] = useState<ReliabilityReport | null>(null);
  const [profile, setProfile] = useState<ReliabilityProfile | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [custom, setCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ReliabilityProfile>("/api/reliability/profile")
      .then((p) => {
        setProfile(p);
        setDraft(JSON.stringify(p, null, 2));
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (custom) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    fetchJson<ReliabilityReport>(`/api/reliability?horizonHours=${horizon}&live=${live ? 1 : 0}`)
      .then(setReport)
      .catch((e) => setError(String(e)));
  }, [horizon, live, custom]);

  const runCustom = async () => {
    setError(null);
    try {
      const body = JSON.parse(draft);
      const rep = await fetchJson<ReliabilityReport>(`/api/reliability/evaluate?horizonHours=${horizon}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCustom(true);
      setReport(rep);
    } catch (e) {
      setError(String(e));
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reliability-report-${report.computedAt.slice(0, 10)}-T${report.horizonHours}h.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const modules = useMemo(() => (report ? [...report.modules].sort((a, b) => b.improvementPotential - a.improvementPotential) : []), [report]);
  const ids = report?.usage.moduleIds ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Самооцінка надійності</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Марківська модель надійності API</h1>
        <p className="max-w-3xl text-sm text-muted">
          Оцінка надійності ПЗ виявлення ознак змови у публічних закупівлях України. Система описана як набір модулів
          і завдань (сценаріїв запитів). З профілю використання автоматично будується вектор початкових станів π₀,
          матриця передачі керування P та ймовірності виходу. Дискретні моделі Gokhale, Kubat і Cheung дають
          ймовірність коректного виконання запиту, неперервна модель Laprie — інтенсивність відмов і надійність за
          період T. У режимі «наживо» стан бази і кешу підставляється в модель.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Період T
          <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1">
            {HORIZONS.map((h) => <option key={h} value={h}>{fmtHours(h)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={live} disabled={custom} onChange={(e) => setLive(e.target.checked)} />
          наживо (стан бази та кешу)
        </label>
        {report && (
          <button onClick={downloadReport} className="rounded-lg border border-line px-3 py-1 hover:bg-surface">
            Завантажити звіт (JSON)
          </button>
        )}
        {custom && (
          <button onClick={() => setCustom(false)} className="rounded-lg border border-line px-3 py-1 hover:bg-surface">
            ← до вбудованого профілю
          </button>
        )}
        {report?.live && (
          <span className="text-xs text-muted">
            база: <b className={report.live.database === "ok" ? "text-green-700" : "text-red-700"}>{report.live.database}</b>, кеш:{" "}
            <b className={report.live.cache === "ok" ? "text-green-700" : "text-amber-700"}>{report.live.cache}</b>
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {!report && !error && <Skeleton lines={6} className="max-w-2xl" />}
      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="R одного запиту (Чеунг)" value={fmtR(report.discrete.systemReliability, 5)} sub={`очікувано ${report.discrete.expectedPathLength.toFixed(2)} викликів модулів, ${report.discrete.meanResponseMs.toFixed(0)} мс`} />
            <Stat label={`R(T) за ${fmtHours(report.horizonHours)} (Лапрі)`} value={fmtR(report.continuous.reliabilityAtHorizon, 4)} sub={`λ = ${report.continuous.failureRatePerHour.toExponential(2)} 1/год, завантаженість ${fmtPct(report.continuous.utilisation, 1)}`} />
            <Stat label="MTTF" value={fmtHours(report.continuous.mttfHours)} sub={report.continuous.availability !== undefined ? `коефіцієнт готовності ${fmtPct(report.continuous.availability, 3)}` : undefined} />
            <Stat label="Невдалих запитів за годину" value={report.discrete.operationalFailuresPerHour === undefined ? "—" : report.discrete.operationalFailuresPerHour.toFixed(1)} sub="за профілем інтенсивності запитів" />
          </div>

          <section className="rounded-2xl border border-line bg-surface p-5 overflow-x-auto">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Порівняння марківських моделей</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-3">Модель</th>
                  <th className="py-2 pr-3">Час</th>
                  <th className="py-2 pr-3">Формула</th>
                  <th className="py-2 pr-3">Результат</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="py-2 pr-3 font-semibold text-ink">Gokhale</td>
                  <td className="py-2 pr-3">дискретний</td>
                  <td className="py-2 pr-3 font-mono text-xs">Vᵢ = qᵢ + Σ Vⱼpⱼᵢ, R = Π Rᵢ^Vᵢ</td>
                  <td className="py-2 pr-3 font-mono">R = {fmtR(report.gokhale.systemReliability, 5)}; критичний — {report.gokhale.criticalModule}</td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-2 pr-3 font-semibold text-ink">Kubat</td>
                  <td className="py-2 pr-3">дискретний</td>
                  <td className="py-2 pr-3 font-mono text-xs">R(k) ≈ Π Rᵢ(k)^Vᵢ(k), λₛ = Σ rₖ[1 − R(k)]</td>
                  <td className="py-2 pr-3 font-mono">
                    1 − R = {report.kubat.failureProbabilityPerRequest.toExponential(2)}
                    {report.kubat.failuresPerHour !== undefined && `; λₛ = ${report.kubat.failuresPerHour.toFixed(1)} відмов/год`}
                  </td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-2 pr-3 font-semibold text-ink">Cheung</td>
                  <td className="py-2 pr-3">дискретний</td>
                  <td className="py-2 pr-3 font-mono text-xs">S = (I − Q)⁻¹, R = Σ Sᵢ Rᵢ eᵢ</td>
                  <td className="py-2 pr-3 font-mono">R = {fmtR(report.discrete.systemReliability, 5)}</td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-2 pr-3 font-semibold text-ink">Laprie</td>
                  <td className="py-2 pr-3">неперервний</td>
                  <td className="py-2 pr-3 font-mono text-xs">πB′ = 0, λₛ = Σ πᵢλᵢ, R(T) = e^(−λₛT)</td>
                  <td className="py-2 pr-3 font-mono">λₛ = {report.continuous.failureRatePerHour.toExponential(2)} 1/год; R(T) = {fmtR(report.continuous.reliabilityAtHorizon, 4)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">R(t) = exp(−λt)</h2>
            <Curve curve={report.continuous.curve} horizon={report.horizonHours} />
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 overflow-x-auto">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Модулі: надійність, чутливість, потенціал покращення</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-3">Модуль</th>
                  <th className="py-2 pr-3">Rᵢ</th>
                  <th className="py-2 pr-3">τᵢ, мс</th>
                  <th className="py-2 pr-3">λᵢ, 1/год</th>
                  <th className="py-2 pr-3">Відвідувань / запит</th>
                  <th className="py-2 pr-3">Частка часу</th>
                  <th className="py-2 pr-3">∂R/∂Rᵢ</th>
                  <th className="py-2 pr-3">ΔR при Rᵢ=1</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-ink">{m.id}</div>
                      <div className="text-xs text-muted">{m.name}</div>
                    </td>
                    <td className="py-2 pr-3 font-mono">{fmtR(m.reliability, 5)}</td>
                    <td className="py-2 pr-3 font-mono">{m.meanSojournMs}</td>
                    <td className="py-2 pr-3 font-mono">{m.failureRatePerHour.toExponential(1)}</td>
                    <td className="py-2 pr-3 font-mono">{m.expectedVisits.toFixed(2)}</td>
                    <td className="py-2 pr-3 font-mono">{fmtPct(m.timeShare, 1)}</td>
                    <td className="py-2 pr-3 font-mono">{m.sensitivity.toFixed(3)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 rounded bg-line">
                          <div className="h-2 rounded bg-red-600" style={{ width: `${Math.min(100, (m.improvementPotential / (modules[0]?.improvementPotential || 1)) * 100)}%` }} />
                        </div>
                        <span className="font-mono text-xs">{m.improvementPotential.toExponential(2)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-surface p-5 overflow-x-auto">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Матриця передачі керування P (рядок → стовпець), π₀ і вихід</h2>
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-left">з \ до</th>
                    {ids.map((id) => <th key={id} className="p-1 font-mono">{id.slice(0, 8)}</th>)}
                    <th className="p-1">вихід</th>
                    <th className="p-1">π₀</th>
                  </tr>
                </thead>
                <tbody>
                  {ids.map((id, i) => (
                    <tr key={id} className="border-t border-line">
                      <td className="p-1 font-mono">{id}</td>
                      {report.usage.transition[i].map((v, j) => (
                        <td key={j} className="p-1 text-center font-mono" style={{ background: v > 0 ? `rgba(220,38,38,${0.15 + 0.6 * v})` : undefined, color: v > 0.5 ? "white" : undefined }}>
                          {v > 0 ? v.toFixed(2) : "·"}
                        </td>
                      ))}
                      <td className="p-1 text-center font-mono">{report.usage.exit[i] > 0 ? report.usage.exit[i].toFixed(2) : "·"}</td>
                      <td className="p-1 text-center font-mono">{report.usage.initial[i] > 0 ? report.usage.initial[i].toFixed(2) : "·"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 overflow-x-auto">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Завдання: частота, надійність за моделлю і спостережена</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-3">Завдання</th>
                    <th className="py-2 pr-3">Вага</th>
                    <th className="py-2 pr-3">R модель</th>
                    <th className="py-2 pr-3">R спостережено</th>
                    <th className="py-2 pr-3">|Δ|</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tasks.map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="py-2 pr-3">
                        <div className="text-ink">{t.name}</div>
                        <div className="font-mono text-xs text-muted">{t.id}</div>
                      </td>
                      <td className="py-2 pr-3 font-mono">{num(t.weight)}</td>
                      <td className="py-2 pr-3 font-mono">{fmtR(t.modelReliability, 4)}</td>
                      <td className="py-2 pr-3 font-mono">{t.observedSuccessRate === undefined ? "—" : fmtR(t.observedSuccessRate, 4)}</td>
                      <td className="py-2 pr-3 font-mono">{t.absError === undefined ? "—" : t.absError.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted">
                Матриця «завдання × модулі» (кількість викликів): {report.usage.taskModule.length} завдань × {ids.length} модулів. Модуль
                викликається запитом з ймовірністю: {ids.map((id, i) => `${id} ${fmtPct(report.usage.moduleUsage[i], 0)}`).join(", ")}.
              </p>
            </section>
          </div>
        </>
      )}

      {profile && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Власний профіль (модулі, завдання, надійності)</h2>
          <p className="mb-3 text-xs text-muted">
            Відредагуйте JSON і натисніть «Обчислити»: так можна оцінити іншу конфігурацію системи або перевірити, як зміна
            надійності одного модуля вплине на систему.
          </p>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={14} className="w-full rounded-lg border border-line bg-white p-3 font-mono text-xs" />
          <div className="mt-3 flex gap-3">
            <button onClick={runCustom} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent">Обчислити</button>
            <button onClick={() => setDraft(JSON.stringify(profile, null, 2))} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-white">Скинути</button>
          </div>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        </section>
      )}
    </div>
  );
}
