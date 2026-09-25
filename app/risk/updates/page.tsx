"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { date, num, riskBadgeClass, riskLabel } from "@/lib/risk";
import { RegisterUpdates } from "@/lib/types";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-3 text-3xl font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

const fmtDate = (v: string) => new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(new Date(v));

export default function RegisterUpdatesPage() {
  const [data, setData] = useState<RegisterUpdates | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [onlyInData, setOnlyInData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    fetchJson<RegisterUpdates>(`/api/risk/register-updates?${q}`).then(setData).catch((e) => setError(String(e)));
  }, [from, to]);

  const rows = data ? data.added.filter((a) => !onlyInData || a.score !== null) : [];
  const s = data?.summary;

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Нові рішення АМКУ</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Кого покарали нещодавно і що сервіс казав про них раніше</h1>
        <p className="max-w-3xl text-base text-muted">
          Реєстр АМКУ оновлюється щотижня. Тут видно компанії, які з’явились у новій версії реєстру, і оцінку, яку сервіс
          дав їм до того, як про рішення стало відомо: модель навчалась на попередній версії реєстру, тому ці компанії
          для неї були «без рішення».
        </p>
      </header>

      {data && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            порівняти версію
            <select value={from ?? data.from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">
              {data.versions.map((v) => <option key={v.version} value={v.version}>{v.version}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            з версією
            <select value={to ?? data.to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">
              {data.versions.map((v) => <option key={v.version} value={v.version}>{v.version}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyInData} onChange={(e) => setOnlyInData(e.target.checked)} />
            лише компанії, які є в наших даних
          </label>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {data && s && (
        <>
          <section className="rounded-2xl border-2 border-ink bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Головне</p>
            <p className="mt-2 text-2xl font-extrabold leading-snug text-ink">
              У реєстрі {data.to} з’явилось {num(s.added)} нових компаній. {num(s.inGraph)} із них були в наших даних, і{" "}
              <span className="text-red-700">{num(s.raisedOrHigh)}</span> уже мали підвищений або високий ризик до рішення.
            </p>
            <p className="mt-2 text-base text-muted">
              Серед {num(s.inGraph)} компаній, які ми бачили, {num(s.highRisk)} мали оцінку «високий» і {num(s.inTop10Pct)} стояли у верхніх 10 % усього
              рейтингу з {num(s.totalScored)} компаній. Медіанний перцентиль цих компаній до рішення: {s.medianPercentile === null ? "—" : Math.round(s.medianPercentile)}.
              Решту {num(s.notInData)} компаній сервіс не бачив зовсім: вони не брали участі в конкурентних тендерах разом із кимось із наших даних.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Нових компаній у реєстрі" value={num(s.added)} sub={`версія ${data.to} проти ${data.from}`} />
            <Stat label="Є в наших даних" value={num(s.inGraph)} sub={`з них з повною історією ${num(s.fullCoverage)}`} />
            <Stat label="Мали високий ризик до рішення" value={num(s.highRisk)} sub="оцінка від 70 %" />
            <Stat label="Зникли з реєстру" value={num(s.removed)} sub="скасовані або виправлені рядки" />
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold text-ink">Нові компанії та їхня оцінка до рішення</h2>
            <p className="mb-3 text-sm text-muted">
              «Оцінка до рішення» — з поточної версії сервісу, навченої на попередньому реєстрі. «Історія часткова» означає, що ми бачимо
              лише частину тендерів компанії, тому її оцінка занижена і ненадійна.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-3">Дата рішення</th>
                    <th className="py-2 pr-3">Рішення</th>
                    <th className="py-2 pr-3">Компанія</th>
                    <th className="py-2 pr-3">Оцінка до рішення</th>
                    <th className="py-2 pr-3">Вище за % компаній</th>
                    <th className="py-2 pr-3">Тендерів</th>
                    <th className="py-2">Історія</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.edrpou} className={`border-t border-line ${(a.score ?? 0) >= 0.7 ? "bg-red-50/60" : ""}`}>
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(a.decisionDate)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{a.decisionNumber}</td>
                      <td className="py-2 pr-3">
                        {a.score !== null ? (
                          <Link href={`/risk/company/${a.edrpou}`} className="font-semibold text-ink hover:text-accent">{a.name || a.edrpou}</Link>
                        ) : <span className="text-ink">{a.name || a.edrpou}</span>}
                        <div className="font-mono text-xs text-muted">{a.edrpou}{a.body ? ` · ${a.body}` : ""}</div>
                      </td>
                      <td className="py-2 pr-3">
                        {a.score === null ? <span className="text-xs text-muted">не було в даних</span> : (
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(a.score)}`}>
                            {Math.round(a.score * 100)} % · {riskLabel(a.score)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono">{a.percentile === null ? "—" : Math.round(a.percentile)}</td>
                      <td className="py-2 pr-3 font-mono">{a.nTenders === null ? "—" : num(a.nTenders)}</td>
                      <td className="py-2 text-xs text-muted">{a.coverage === "full" ? "повна" : a.coverage ? "часткова" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.removed.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-base font-bold text-ink">Зникли з реєстру між версіями</h2>
              <p className="mb-3 text-sm text-muted">Зазвичай це скасовані судом рішення або виправлені коди. У навчанні ці компанії поки лишаються з міткою «покарана».</p>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {data.removed.map((r) => <li key={r.edrpou}><span className="font-mono text-xs text-muted">{r.edrpou}</span> {r.name}</li>)}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
            <p className="font-semibold text-ink">Як читати чесно</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Це не ретроспективна перевірка з розділу «Перевірка на минулому»: там порівнюються лише компанії з повною історією. Тут показано всіх, кого ми бачили, включно з частковою історією, тому оцінки тут скоріше занижені.</li>
              <li>Компанії з 1–3 тендерами в наших даних можуть мати високу оцінку через одного покараного партнера. Дивіться на кількість тендерів.</li>
              <li>Коли реєстр повністю оновлюється в моделі (щотижневий перерахунок), ці компанії стануть навчальними прикладами, і їхня оцінка перестане бути «до рішення».</li>
            </ul>
            <p className="mt-3 text-xs">
              Дата оновлення реєстру береться з data.gov.ua; час між рішенням і його появою у зведеному файлі становить від кількох днів до кількох тижнів.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
