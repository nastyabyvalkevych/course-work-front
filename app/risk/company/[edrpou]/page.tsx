"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import RiskGraphView from "@/components/RiskGraph";
import { fetchJson } from "@/lib/api";
import { date, money, num, pct, riskBadgeClass, riskBarColor, riskLabel } from "@/lib/risk";
import { reasonsCompany, verdictCompany } from "@/lib/explain";
import { RiskCompany, RiskGraph } from "@/lib/types";

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>}
      {children}
    </section>
  );
}

export default function CompanyRiskPage() {
  const { edrpou } = useParams<{ edrpou: string }>();
  const router = useRouter();
  const [data, setData] = useState<RiskCompany | null>(null);
  const [graph, setGraph] = useState<RiskGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // reset then load on route param change; the synchronous reset is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setGraph(null);
    setError(null);
    fetchJson<RiskCompany>(`/api/risk/company/${edrpou}`).then(setData).catch((e) => setError(String(e)));
    fetchJson<RiskGraph>(`/api/risk/company/${edrpou}/graph?limit=40`).then(setGraph).catch(() => setGraph(null));
  }, [edrpou]);

  const onSelect = useCallback((id: string) => router.push(`/risk/company/${id}`), [router]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Компанію {edrpou} не знайдено серед учасників торгів у базі. Оцінка можлива лише для
          компаній, які подавали хоча б одну ставку.
        </p>
      </div>
    );
  }
  if (!data) return <p className="text-muted">Завантаження…</p>;

  const maxAbs = Math.max(...data.contributions.map((c) => Math.abs(c.contribution)), 1e-6);

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Картка компанії</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{data.name ?? data.edrpou}</h1>
          <p className="mt-1 text-sm text-muted">
            ЄДРПОУ {data.edrpou} · історія {data.coverage === "full" ? "повна" : data.coverage === "capped" ? "обрізана стелею порталу" : "часткова"}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 text-right">
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">Наскільки схожа на покараних</p>
          <p className="mt-2 text-5xl font-extrabold leading-none" style={{ color: riskBarColor(data.score) }}>{pct(data.score)}</p>
          <p className="mt-2 text-sm">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(data.score)}`}>{riskLabel(data.score)}</span>
            <span className="ml-2 text-muted">ризик вищий, ніж у {data.percentile.toFixed(0)} % компаній</span>
          </p>
        </div>
      </header>

      {(() => {
        const v = verdictCompany(data);
        const reasons = reasonsCompany(data);
        return (
          <section className="rounded-2xl border-2 border-ink bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Простими словами</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">{v.title}</h2>
            <p className="mt-2 text-base text-muted">{v.text}</p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {reasons.map((r) => (
                <li key={r.title} className={`rounded-xl border p-4 ${r.kind === "up" ? "border-red-200 bg-red-50" : r.kind === "down" ? "border-green-200 bg-green-50" : "border-line bg-surface"}`}>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {r.kind === "up" ? <span className="text-red-700">▲ підвищує ризик</span> : r.kind === "down" ? <span className="text-green-700">▼ знижує ризик</span> : <span className="text-muted">● варто знати</span>}
                  </p>
                  <p className="mt-1 font-semibold text-ink">{r.title}</p>
                  <p className="mt-1 text-sm text-muted">{r.text}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {data.label && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <p className="font-semibold">Компанія є у реєстрі АМКУ щодо спотворення результатів торгів.</p>
          <ul className="mt-2 space-y-1">
            {data.decisions.map((d) => (
              <li key={`${d.decisionNumber}-${d.decisionDate}`}>
                Рішення {d.decisionNumber} від {date(d.decisionDate)}{d.body ? `, ${d.body}` : ""}
                {d.courtContent ? <span className="text-red-700"> · суд: {d.courtContent.slice(0, 80)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Тендерів зі ставками", num(data.nTenders)],
          ["Перемог", `${num(data.nWon)} (${pct(data.winRate)})`],
          ["Партнерів по торгах", num(data.degree)],
          ["Замовників", num(data.features.n_buyers)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">{l}</p>
            <p className="mt-3 text-2xl font-extrabold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Показники для фахівців" className="lg:col-span-2">
          <p className="mb-3 text-xs text-muted">
            Які показники компанії тягнуть оцінку вгору (червоне) або вниз (зелене). Окрім них, сервіс
            враховує партнерів, показаних на мапі праворуч.
          </p>
          <ul className="space-y-2">
            {data.contributions.map((c) => (
              <li key={c.feature} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-ink">{c.label}</span>
                  <span className="font-mono text-xs text-muted">
                    {c.feature.includes("rate") || c.feature.includes("share") || c.feature === "clustering"
                      ? c.value.toFixed(2)
                      : num(Math.round(c.value))}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded bg-line/60">
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${(Math.abs(c.contribution) / maxAbs) * 100}%`,
                      background: c.contribution > 0 ? "#dc2626" : "#16a34a",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="З ким ходить на торги" className="lg:col-span-3">
          <p className="mb-3 text-xs text-muted">
            Кожне коло — компанія, лінія — спільні тендери. Чим більше коло, тим частіше зустрічались; чим червоніше, тим вищий ризик; червона обводка — уже покарана АМКУ. Клік відкриває картку партнера.
          </p>
          {graph ? <RiskGraphView graph={graph} onSelect={onSelect} /> : <p className="text-sm text-muted">Граф завантажується…</p>}
        </Card>
      </div>

      {data.topNeighbors.some((n) => n.influence !== undefined) && (
        <Card title="Через кого ризик вищий">
          <p className="mb-3 text-xs text-muted">
            Наскільки нижчою була б оцінка, якби ця компанія ніколи не зустрічалась із партнером на торгах. Плюс означає, що партнер додає ризику.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...data.topNeighbors]
              .filter((n) => n.influence !== undefined)
              .sort((a, b) => (b.influence ?? 0) - (a.influence ?? 0))
              .map((n) => (
                <li key={n.edrpou} className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={`/risk/company/${n.edrpou}`} className="font-semibold text-ink hover:text-accent">{n.name ?? n.edrpou}</Link>
                    <div className="text-xs text-muted">{n.weight} спільних тендерів{n.label ? " · у реєстрі АМКУ" : ""}</div>
                  </div>
                  <span className={`ml-3 font-mono text-sm ${(n.influence ?? 0) > 0 ? "text-red-700" : "text-green-700"}`}>
                    {(n.influence ?? 0) > 0 ? "+" : ""}{((n.influence ?? 0) * 100).toFixed(1)} зі 100
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card title="З ким постійно зустрічається на торгах">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-4">Партнер</th>
                <th className="py-2 pr-4">Спільних тендерів</th>
                <th className="py-2 pr-4">Виграв партнер</th>
                <th className="py-2 pr-4">Виграла ця компанія</th>
                <th className="py-2 pr-4">Ризик партнера</th>
                <th className="py-2">АМКУ</th>
              </tr>
            </thead>
            <tbody>
              {data.coBidders.map((p) => (
                <tr key={p.edrpou} className="border-t border-line">
                  <td className="py-2 pr-4">
                    <Link href={`/risk/company/${p.edrpou}`} className="font-semibold text-ink hover:text-accent">{p.name ?? p.edrpou}</Link>
                    <div className="text-xs text-muted">{p.edrpou}</div>
                  </td>
                  <td className="py-2 pr-4">{num(p.sharedTenders)}</td>
                  <td className="py-2 pr-4">{num(p.theyWon)}</td>
                  <td className="py-2 pr-4">{num(p.weWon)}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(p.score)}`}>{pct(p.score)}</span>
                  </td>
                  <td className="py-2 text-xs text-red-700">{p.label ? "у реєстрі" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Останні тендери">
        <ul className="divide-y divide-line text-sm">
          {data.recentTenders.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <Link href={`/risk/tender/${t.tenderID ?? t.id}`} className="font-semibold text-ink hover:text-accent">
                  {t.title ?? t.tenderID ?? `#${t.id}`}
                </Link>
                <div className="truncate text-xs text-muted">{t.procuringEntity} · {date(t.datePublished)} · {t.tenderID}</div>
              </div>
              <div className="text-right text-xs">
                <div>{money(t.valueAmount)}</div>
                <div className="text-muted">{t.bidders} учасн. {t.won ? <span className="font-semibold text-ink">· перемога</span> : null}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs text-muted">
        Число ризику показує, наскільки історія торгів компанії схожа на історії компаній, покараних АМКУ. Це не доказ
        порушення і не звинувачення. Для покараних компаній усе пораховано лише за тендерами до дати рішення.
      </p>
    </div>
  );
}
