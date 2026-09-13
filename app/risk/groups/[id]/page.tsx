"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import CsvButton from "@/components/CsvButton";
import { fetchJson } from "@/lib/api";
import { date, money, num, pct, riskBadgeClass, riskLabel } from "@/lib/risk";
import { GroupDetail, LINK_KIND_LABEL } from "@/lib/types-insights";

function summary(g: GroupDetail) {
  const names = g.members.map((m) => m.name ?? m.edrpou);
  const winners = [...g.members].sort((a, b) => b.nWon - a.nWon);
  const top = winners[0];
  const never = g.members.filter((m) => m.nWon === 0);
  const parts: string[] = [];
  parts.push(`${g.size} компаній (${names.slice(0, 3).join(", ")}${g.size > 3 ? " та інші" : ""}) зустрічались між собою у ${num(g.sharedTenders)} тендерах з ${date(g.firstShared)} по ${date(g.lastShared)}.`);
  parts.push(`Разом вони виграли на ${money(g.wonAmount)}.`);
  if (top && top.nWon > 0) parts.push(`Найчастіше вигравала ${top.name ?? top.edrpou}: ${top.nWon} перемог.`);
  if (never.length) parts.push(`${never.length === 1 ? "Одна компанія" : `${never.length} компаній`} з групи не виграла жодного разу, хоча брала участь: так виглядає роль «для конкуренції».`);
  if (g.sanctioned > 0) parts.push(`${g.sanctioned} із них уже покарані Антимонопольним комітетом${g.sameDecision > 0 ? `, ${g.sameDecision} пар названі в одному рішенні` : ""}.`);
  else if (g.maxScore >= 0.7) parts.push("Ніхто з них поки не покараний, але історія торгів дуже схожа на покараних.");
  if (g.links.length) parts.push(`${g.links.length} пар у групі ділять спільні контакти (телефон, пошту, людину або адресу).`);
  return parts.join(" ");
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    fetchJson<GroupDetail>(`/api/risk/groups/${id}`).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/risk/groups" className="text-sm text-muted hover:text-ink">← До груп</Link>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Групу {id} не знайдено.</p>
      </div>
    );
  }
  if (!data) return <p className="text-muted">Завантаження…</p>;

  const names = new Map(data.members.map((m) => [m.edrpou, m.name ?? m.edrpou]));

  return (
    <div className="space-y-8">
      <Link href="/risk/groups" className="text-sm text-muted hover:text-ink">← До груп</Link>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Група №{data.id}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{data.size} компаній, які ходять на торги разом</h1>
        <p className="mt-1 text-sm text-muted">
          {data.regions.length ? data.regions.join(", ") : "область невідома"}{data.topCpv.length ? ` · ринки ${data.topCpv.join(", ")}` : ""}
        </p>
      </header>

      <section className="rounded-2xl border-2 border-ink bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Простими словами</p>
        <p className="mt-2 text-base leading-relaxed text-ink">{summary(data)}</p>
        <p className="mt-3 text-xs text-muted">Це підказка, з чого почати перевірку, а не висновок про порушення.</p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Учасники групи</h2>
          <CsvButton filename={`grupa-${data.id}`} rows={data.members.map((m) => ({ edrpou: m.edrpou, name: m.name, tenders: m.nTenders, wins: m.nWon, won_amount: Math.round(m.wonAmount), score: m.score?.toFixed(3) ?? "", sanctioned: m.label ? 1 : 0 }))} />
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="py-2 pr-4">Компанія</th>
              <th className="py-2 pr-4">Тендерів</th>
              <th className="py-2 pr-4">Перемог</th>
              <th className="py-2 pr-4">Сума перемог</th>
              <th className="py-2 pr-4">Схожість на покараних</th>
              <th className="py-2">Реєстр АМКУ</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.edrpou} className="border-t border-line">
                <td className="py-2 pr-4">
                  <Link href={`/risk/company/${m.edrpou}`} className="font-semibold text-ink hover:text-accent">{m.name ?? m.edrpou}</Link>
                  <div className="font-mono text-xs text-muted">{m.edrpou}</div>
                </td>
                <td className="py-2 pr-4 font-mono">{num(m.nTenders)}</td>
                <td className="py-2 pr-4 font-mono">{num(m.nWon)} <span className="text-xs text-muted">({m.nTenders ? pct(m.nWon / m.nTenders) : "—"})</span></td>
                <td className="py-2 pr-4 font-mono text-xs">{money(m.wonAmount)}</td>
                <td className="py-2 pr-4"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(m.score)}`}>{riskLabel(m.score)}</span></td>
                <td className="py-2 text-xs text-red-700">{m.label ? "уже покарана" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Хто з ким і скільки разів</h2>
          <ul className="space-y-2 text-sm">
            {data.pairs.map((p) => {
              const oneSided = (p.aWon === 0 && p.bWon >= 3) || (p.bWon === 0 && p.aWon >= 3);
              return (
                <li key={`${p.a}-${p.b}`} className={`rounded-xl border p-3 ${oneSided ? "border-red-200 bg-red-50" : "border-line bg-white"}`}>
                  <span className="font-semibold text-ink">{names.get(p.a)}</span> і <span className="font-semibold text-ink">{names.get(p.b)}</span>
                  <div className="text-xs text-muted">
                    {p.shared} спільних тендерів · перша вигравала {p.aWon}, друга {p.bWon}{oneSided ? " · одна не виграла жодного разу" : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">У кого купували</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="py-2 pr-4">Замовник</th><th className="py-2 pr-4">Тендерів</th><th className="py-2">Сума перемог</th></tr>
            </thead>
            <tbody>
              {data.buyers.map((b) => (
                <tr key={b.edrpou ?? b.name ?? ""} className="border-t border-line">
                  <td className="py-2 pr-4">
                    {b.edrpou ? <Link href={`/risk/buyer/${b.edrpou}`} className="font-semibold text-ink hover:text-accent">{b.name ?? b.edrpou}</Link> : <span className="text-ink">{b.name ?? "—"}</span>}
                  </td>
                  <td className="py-2 pr-4 font-mono">{num(b.tenders)}</td>
                  <td className="py-2 font-mono text-xs">{money(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Спільні контакти</h2>
        <p className="mb-3 text-xs text-muted">Компанії, які в картках учасника Prozorro вказували один і той самий телефон, пошту, контактну особу або адресу.</p>
        {data.links.length === 0 ? (
          <p className="text-sm text-muted">Спільних контактів між учасниками групи не знайдено.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.links.map((l) => (
              <li key={l.id} className="rounded-xl border border-red-200 bg-red-50 p-3">
                <span className="font-semibold text-ink">{names.get(l.edrpouA) ?? l.edrpouA}</span> і <span className="font-semibold text-ink">{names.get(l.edrpouB) ?? l.edrpouB}</span>
                <span className="ml-2 text-xs text-red-800">спільні: {l.kinds.map((k) => LINK_KIND_LABEL[k] ?? k).join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Останні спільні тендери</h2>
        <ul className="divide-y divide-line text-sm">
          {data.recentTenders.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <Link href={`/risk/tender/${t.tender_id ?? t.id}`} className="font-semibold text-ink hover:text-accent">{t.title ?? t.tender_id ?? `#${t.id}`}</Link>
                <div className="truncate text-xs text-muted">{t.buyer} · {date(t.date)} · {t.tender_id}</div>
              </div>
              <div className="text-right text-xs">
                <div>{money(t.value)}</div>
                <div className="text-muted">{t.members} з групи · переміг: {t.winner ?? "—"}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
