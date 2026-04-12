"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import {
  OsintReport,
  CoParticipationPair,
  WinRateAnomaly,
  RegionalDominanceEntry,
  HhiEntry,
  BidRotationCohort,
  TopSingleBidderEntity,
} from "@/lib/types";

function StatCard({
  label,
  value,
  sublabel,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 border-red-200"
      : tone === "warning"
        ? "bg-amber-50 border-amber-200"
        : "bg-surface";

  return (
    <div className={`rounded-2xl border p-6 ${toneClass}`}>
      <p className="text-[0.75rem] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-4 text-4xl font-extrabold leading-none tracking-tight text-ink">
        {value}
      </p>
      {sublabel && <p className="mt-2 text-sm text-muted">{sublabel}</p>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-ink">
      {children}
    </h2>
  );
}

function HhiLevelBadge({ level }: { level: HhiEntry["level"] }) {
  const className =
    level === "highly concentrated"
      ? "bg-red-100 text-red-800"
      : level === "moderately concentrated"
        ? "bg-amber-100 text-amber-800"
        : "bg-green-100 text-green-800";

  const label =
    level === "highly concentrated"
      ? "Highly"
      : level === "moderately concentrated"
        ? "Moderate"
        : "Low";

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

export default function OsintPage() {
  const [report, setReport] = useState<OsintReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<OsintReport>("/api/osint/report")
      .then((data) => setReport(data))
      .catch((err: Error) => {
        if (err.message.includes("404")) {
          setError(null); // Not an error, just no report yet
        } else {
          setError(err.message);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <section className="grid gap-10 lg:gap-14">
        <div className="rounded-[2rem] bg-surface p-10 text-center">
          <p className="text-xl font-bold text-ink">
            Завантаження OSINT-звіту...
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="grid gap-10 lg:gap-14">
        <div className="rounded-[2rem] bg-red-50 p-10 text-red-700">
          <h2 className="text-2xl font-bold">Помилка</h2>
          <p className="mt-2">{error}</p>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="grid gap-10 lg:gap-14">
        <div className="rounded-[2rem] bg-surface px-6 py-10 sm:px-10 lg:px-12">
          <h1 className="text-3xl font-extrabold text-ink">OSINT-аналіз</h1>
          <p className="mt-4 text-muted">
            Звіт ще не згенеровано. Запустіть{" "}
            <code className="rounded bg-gray-100 px-2 py-1">
              POST /api/osint/generate
            </code>{" "}
            з API-ключем.
          </p>
        </div>
      </section>
    );
  }

  const coParticipation = report.coParticipationPairs as CoParticipationPair[];
  const winRates = report.winRateAnomalies as WinRateAnomaly[];
  const regionalDominance = report.regionalDominance as RegionalDominanceEntry[];
  const hhi = report.hhiPerCpv as HhiEntry[];
  const bidRotation = report.bidRotationCohorts as BidRotationCohort[];
  const topSingleBidder =
    report.topSingleBidderEntities as TopSingleBidderEntity[];

  const highlyConcentrated = hhi.filter(
    (h) => h.level === "highly concentrated"
  );

  return (
    <section className="grid gap-10 lg:gap-14">
      {/* Header */}
      <div className="rounded-[2rem] bg-surface px-6 py-10 sm:px-10 lg:px-12">
        <p className="text-[0.8rem] font-bold uppercase tracking-wider text-muted">
          OECD Bid-Rigging Indicators
        </p>
        <h1 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-[0.95] tracking-tight text-ink uppercase">
          OSINT-аналіз
          <br />
          публічних закупівель
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Статистичні індикатори змови згідно з методологією OECD (2009, 2012).
          Жоден показник не є доказом правопорушення — це сигнали для подальшої
          перевірки.
        </p>
        <p className="mt-4 text-sm text-muted">
          Звіт згенеровано:{" "}
          {new Date(report.generatedAt).toLocaleString("uk-UA")} | Тендерів:{" "}
          {report.numTenders.toLocaleString("uk-UA")}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Single-Bidder тендерів"
          value={report.singleBidderCount.toLocaleString("uk-UA")}
          sublabel={`${(report.singleBidderRatio * 100).toFixed(1)}% від загальної кількості`}
          tone="warning"
        />
        <StatCard
          label="Multi-Bidder тендерів"
          value={report.multiBidderCount.toLocaleString("uk-UA")}
          sublabel="З конкуренцією"
        />
        <StatCard
          label="100% Win Rate"
          value={winRates.length}
          sublabel={`Компаній з >= 3 ставок`}
          tone={winRates.length > 20 ? "warning" : "neutral"}
        />
        <StatCard
          label="Concentrated Markets"
          value={highlyConcentrated.length}
          sublabel="CPV-категорій з HHI > 2500"
          tone={highlyConcentrated.length > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Win Rate Anomalies */}
      <div className="rounded-[2rem] bg-surface p-6 sm:p-8">
        <SectionHeader>Компанії з 100% Win Rate (&gt;= 3 ставки)</SectionHeader>
        {winRates.length === 0 ? (
          <p className="text-muted">Аномалій не виявлено</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-muted">
                  <th className="py-3 pr-4">ЄДРПОУ</th>
                  <th className="py-3 pr-4">Назва</th>
                  <th className="py-3 pr-4 text-right">Ставок</th>
                  <th className="py-3 text-right">Перемог</th>
                </tr>
              </thead>
              <tbody>
                {winRates.slice(0, 15).map((w) => (
                  <tr
                    key={w.edrpou}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">{w.edrpou}</td>
                    <td className="max-w-xs truncate py-3 pr-4">{w.name}</td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      {w.bids}
                    </td>
                    <td className="py-3 text-right font-semibold text-green-700">
                      {w.wins}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {winRates.length > 15 && (
              <p className="mt-4 text-sm text-muted">
                + ще {winRates.length - 15} компаній
              </p>
            )}
          </div>
        )}
      </div>

      {/* Co-participation Pairs */}
      <div className="rounded-[2rem] bg-surface p-6 sm:p-8">
        <SectionHeader>Топ-пари компаній за спільними участями</SectionHeader>
        {coParticipation.length === 0 ? (
          <p className="text-muted">Пар не виявлено</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {coParticipation.slice(0, 10).map((pair, i) => (
              <div
                key={`${pair.edrpouA}-${pair.edrpouB}`}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-ink">
                    {pair.count}
                  </span>
                  <span className="text-xs text-muted">тендерів разом</span>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="font-mono text-xs text-muted">
                      {pair.edrpouA}
                    </span>{" "}
                    <span className="truncate">{pair.nameA.slice(0, 40)}</span>
                  </p>
                  <p>
                    <span className="font-mono text-xs text-muted">
                      {pair.edrpouB}
                    </span>{" "}
                    <span className="truncate">{pair.nameB.slice(0, 40)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regional Dominance */}
      <div className="rounded-[2rem] bg-surface p-6 sm:p-8">
        <SectionHeader>Регіональне домінування (&gt; 20%)</SectionHeader>
        {regionalDominance.length === 0 ? (
          <p className="text-muted">Домінування не виявлено</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-muted">
                  <th className="py-3 pr-4">Регіон</th>
                  <th className="py-3 pr-4">Домінант</th>
                  <th className="py-3 pr-4 text-right">Перемог</th>
                  <th className="py-3 pr-4 text-right">Всього</th>
                  <th className="py-3 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {regionalDominance.slice(0, 15).map((r) => (
                  <tr
                    key={r.region}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-3 pr-4 font-semibold">{r.region}</td>
                    <td className="max-w-xs truncate py-3 pr-4">
                      {r.dominantName}
                    </td>
                    <td className="py-3 pr-4 text-right">{r.wins}</td>
                    <td className="py-3 pr-4 text-right">{r.total}</td>
                    <td className="py-3 text-right font-semibold text-amber-700">
                      {r.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Market Concentration (HHI) */}
      <div className="rounded-[2rem] bg-surface p-6 sm:p-8">
        <SectionHeader>Концентрація ринку (HHI по CPV-2)</SectionHeader>
        <p className="mb-4 text-sm text-muted">
          HHI {">"} 2500 = висока концентрація, 1500-2500 = помірна, {"<"} 1500
          = низька (OECD/USDOJ)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-muted">
                <th className="py-3 pr-4">CPV-2</th>
                <th className="py-3 pr-4 text-right">Тендерів</th>
                <th className="py-3 pr-4 text-right">Постачальників</th>
                <th className="py-3 pr-4 text-right">HHI</th>
                <th className="py-3">Рівень</th>
              </tr>
            </thead>
            <tbody>
              {hhi.slice(0, 20).map((h) => (
                <tr
                  key={h.cpvDivision}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-3 pr-4 font-mono font-semibold">
                    {h.cpvDivision}
                  </td>
                  <td className="py-3 pr-4 text-right">{h.totalAwards}</td>
                  <td className="py-3 pr-4 text-right">{h.uniqueSuppliers}</td>
                  <td className="py-3 pr-4 text-right font-semibold">
                    {Math.round(h.hhi)}
                  </td>
                  <td className="py-3">
                    <HhiLevelBadge level={h.level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bid Rotation */}
      <div className="rounded-[2rem] bg-surface p-6 sm:p-8">
        <SectionHeader>Підозрілі когорти (Bid Rotation)</SectionHeader>
        <p className="mb-4 text-sm text-muted">
          Uniformity {">"} 0.6 означає рівномірний розподіл перемог у групі
          (можлива ротація)
        </p>
        {bidRotation.length === 0 ? (
          <p className="text-muted">Підозрілих когорт не виявлено</p>
        ) : (
          <div className="space-y-3">
            {bidRotation.slice(0, 10).map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-semibold">
                    {c.cohortSize} компаній
                  </span>
                  <span className="text-muted">|</span>
                  <span>{c.numTenders} тендерів разом</span>
                  <span className="text-muted">|</span>
                  <span>{c.winnersCount} різних переможців</span>
                  <span className="text-muted">|</span>
                  <span className="font-semibold text-amber-700">
                    Uniformity: {c.uniformity.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Single-Bidder Entities */}
      <div className="rounded-[2rem] bg-surface p-6 sm:p-8">
        <SectionHeader>Замовники з найбільшою кількістю Single-Bidder тендерів</SectionHeader>
        {topSingleBidder.length === 0 ? (
          <p className="text-muted">Даних немає</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-muted">
                  <th className="py-3 pr-4">ЄДРПОУ</th>
                  <th className="py-3 pr-4">Назва</th>
                  <th className="py-3 text-right">Single-Bid тендерів</th>
                </tr>
              </thead>
              <tbody>
                {topSingleBidder.slice(0, 15).map((e) => (
                  <tr
                    key={e.edrpou}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">{e.edrpou}</td>
                    <td className="max-w-xs truncate py-3 pr-4">{e.name}</td>
                    <td className="py-3 text-right font-semibold text-amber-700">
                      {e.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <p className="text-sm leading-relaxed text-amber-900">
          <strong>УВАГА.</strong> Жоден показник вище не є доказом змови,
          шахрайства чи будь-якого іншого правопорушення. Це статистичні сигнали
          згідно з методологією OECD (2009, 2012) для пріоритезації подальшої
          ручної перевірки журналістом чи антикорупційним аналітиком. Для
          юридично вагомих висновків потрібні додаткові докази поза межами цієї
          системи.
        </p>
      </div>
    </section>
  );
}
