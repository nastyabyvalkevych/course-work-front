"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { date, money, num, pct, riskBadgeClass, riskBarColor, riskLabel } from "@/lib/risk";
import { RiskTender } from "@/lib/types";

export default function TenderRiskPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RiskTender | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // reset then load on route param change; the synchronous reset is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    fetchJson<RiskTender>(`/api/risk/tender/${encodeURIComponent(id)}`).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Тендер {id} не знайдено в локальній базі. Підтримуються номер виду UA-РРРР-ММ-ДД-NNNNNN-x,
          внутрішній ідентифікатор Prozorro або числовий id.
        </p>
      </div>
    );
  }
  if (!data) return <p className="text-muted">Завантаження…</p>;

  const names = new Map(data.participants.map((p) => [p.edrpou, p.name ?? p.edrpou]));
  const t = data.tender;
  const s = data.signals;

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Перевірка тендера</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{t.title ?? t.tenderID}</h1>
          <p className="mt-1 text-sm text-muted">
            {t.tenderID} · {t.procuringEntity} · {date(t.datePublished)} · {t.procurementMethodType} · {t.status}
          </p>
          <p className="mt-1 text-sm text-ink">Очікувана вартість: {money(t.valueAmount, t.valueCurrency)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 text-right">
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">Ризик змови у тендері</p>
          <p className="mt-2 text-5xl font-extrabold leading-none" style={{ color: riskBarColor(s.tenderRisk) }}>{pct(s.tenderRisk)}</p>
          <p className="mt-2 text-xs text-muted">
            {s.biddersCount} учасн. · {s.knownParticipants} у реєстрі АМКУ · {s.repeatedPairs} повторюваних пар
          </p>
        </div>
      </header>

      {s.repeatedPairs > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Учасники цього тендера вже зустрічались між собою на торгах.</p>
          <ul className="mt-2 space-y-1">
            {data.pairs
              .filter((p) => p.sharedTenders >= 3)
              .sort((a, b) => b.sharedTenders - a.sharedTenders)
              .map((p) => (
                <li key={`${p.a}-${p.b}`}>
                  <b>{names.get(p.a)}</b> і <b>{names.get(p.b)}</b>: {p.sharedTenders} спільних тендерів раніше,
                  перемоги {p.aWon} проти {p.bWon}.
                </li>
              ))}
          </ul>
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Учасники</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-4">Компанія</th>
                <th className="py-2 pr-4">Ставка</th>
                <th className="py-2 pr-4">Результат</th>
                <th className="py-2 pr-4">Ризик</th>
                <th className="py-2 pr-4">Історія</th>
                <th className="py-2">АМКУ</th>
              </tr>
            </thead>
            <tbody>
              {data.participants.map((p) => (
                <tr key={p.edrpou} className="border-t border-line">
                  <td className="py-2 pr-4">
                    <Link href={`/risk/company/${p.edrpou}`} className="font-semibold text-ink hover:text-accent">{p.name ?? p.edrpou}</Link>
                    <div className="text-xs text-muted">{p.edrpou}</div>
                  </td>
                  <td className="py-2 pr-4">{money(p.bidAmount, t.valueCurrency)}</td>
                  <td className="py-2 pr-4">{p.isWinner ? <span className="font-semibold text-ink">переможець</span> : <span className="text-muted">не виграв</span>}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(p.score)}`}>
                      {pct(p.score)} · {riskLabel(p.score)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted">
                    {p.nTenders === null ? "—" : `${num(p.nTenders)} тендерів, перемог ${pct(p.winRate)}`}
                  </td>
                  <td className="py-2 text-xs text-red-700">{p.label ? "у реєстрі" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted">
        Ризик тендера поєднує найвищий індекс серед учасників і наявність пар, які раніше зустрічались на
        трьох і більше торгах. Це підстава для додаткової перевірки, а не висновок про порушення.
      </p>
    </div>
  );
}
