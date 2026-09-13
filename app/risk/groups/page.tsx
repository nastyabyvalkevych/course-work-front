"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CsvButton from "@/components/CsvButton";
import { fetchJson } from "@/lib/api";
import { date, money, num, riskBadgeClass, riskLabel } from "@/lib/risk";
import { GroupList, REGION_LIST } from "@/lib/types-insights";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-3 text-2xl font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default function GroupsPage() {
  const [sort, setSort] = useState("risk");
  const [region, setRegion] = useState("");
  const [minSize, setMinSize] = useState(2);
  const [onlyUnsanctioned, setOnlyUnsanctioned] = useState(false);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<GroupList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = 30;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset), sort, minSize: String(minSize) });
    if (region) p.set("region", region);
    if (onlyUnsanctioned) p.set("onlyUnsanctioned", "1");
    fetchJson<GroupList>(`/api/risk/groups?${p}`).then(setData).catch((e) => setError(String(e)));
  }, [sort, region, minSize, onlyUnsanctioned, offset]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Групи</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Хто ходить на торги разом</h1>
        <p className="max-w-3xl text-sm text-muted">
          Тут зібрані невеликі групи компаній, які зустрічаються на торгах переважно одна з одною: три і більше спільних тендерів,
          і принаймні половина торгів кожної проходить у цьому ж колі. Так виглядає коло «своїх», яке ділить ринок.
        </p>
      </header>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Груп знайдено" value={num(data.summary.groups)} />
          <Stat label="Компаній у них" value={num(data.summary.companies)} />
          <Stat label="Виграли разом" value={money(data.summary.wonAmount)} sub="сума перемог усіх учасників груп" />
          <Stat label="Уже покарані АМКУ" value={num(data.summary.sanctioned)} sub="компаній із цих груп" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Спочатку
          <select value={sort} onChange={(e) => { setSort(e.target.value); setOffset(0); }} className="rounded-lg border border-line bg-white px-2 py-1">
            <option value="risk">найбільш схожі на покараних</option>
            <option value="money">найбільші суми</option>
            <option value="size">найбільші групи</option>
            <option value="sanctioned">найбільше покараних</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Область
          <select value={region} onChange={(e) => { setRegion(e.target.value); setOffset(0); }} className="rounded-lg border border-line bg-white px-2 py-1">
            <option value="">усі</option>
            {REGION_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          від
          <select value={minSize} onChange={(e) => { setMinSize(Number(e.target.value)); setOffset(0); }} className="rounded-lg border border-line bg-white px-2 py-1">
            {[2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          компаній
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyUnsanctioned} onChange={(e) => { setOnlyUnsanctioned(e.target.checked); setOffset(0); }} />
          лише ще не покарані
        </label>
        <CsvButton
          filename="grupy"
          rows={items.map((g) => ({
            group_id: g.id, size: g.size, members: g.members.map((m) => `${m.name ?? m.edrpou} (${m.edrpou})`).join(" | "),
            shared_tenders: g.sharedTenders, won_amount: Math.round(g.wonAmount), sanctioned: g.sanctioned, max_score: g.maxScore.toFixed(3),
            regions: g.regions.join(" | "), cpv: g.topCpv.join(" | "), first: g.firstShared?.slice(0, 10) ?? "", last: g.lastShared?.slice(0, 10) ?? "",
          }))}
        />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {data && items.length === 0 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Дані про групи ще завантажуються або нічого не знайдено за цими фільтрами.
        </p>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {items.map((g) => (
          <li key={g.id} className={`rounded-2xl border p-5 ${g.sanctioned > 0 ? "border-red-200 bg-red-50/50" : "border-line bg-surface"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/risk/groups/${g.id}`} className="text-lg font-bold text-ink hover:text-accent">Група №{g.id}: {g.size} компаній</Link>
                <p className="text-xs text-muted">
                  {num(g.sharedTenders)} спільних тендерів · {date(g.firstShared)} – {date(g.lastShared)}
                  {g.regions.length ? ` · ${g.regions.join(", ")}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-ink">{money(g.wonAmount)}</p>
                <p className="text-xs text-muted">виграли разом</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {g.members.slice(0, 6).map((m) => (
                <li key={m.edrpou} className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href={`/risk/company/${m.edrpou}`} className="font-semibold text-ink hover:text-accent">{m.name ?? m.edrpou}</Link>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${riskBadgeClass(m.score)}`}>{riskLabel(m.score)}</span>
                  {m.label && <span className="text-xs font-semibold text-red-700">покарана</span>}
                  <span className="text-xs text-muted">{m.nWon} перемог з {m.nTenders}</span>
                </li>
              ))}
              {g.members.length > 6 && <li className="text-xs text-muted">і ще {g.members.length - 6}…</li>}
            </ul>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
              {g.sanctioned > 0 && <span className="font-semibold text-red-700">{g.sanctioned} уже покарано{g.sameDecision > 0 ? `, ${g.sameDecision} пар в одному рішенні` : ""}</span>}
              {g.topCpv.length > 0 && <span>ринки: {g.topCpv.join(", ")}</span>}
              <Link href={`/risk/groups/${g.id}`} className="ml-auto font-semibold text-accent">Докладніше →</Link>
            </div>
          </li>
        ))}
      </ul>

      {data && data.total > limit && (
        <div className="flex items-center justify-between text-sm">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">← Попередні</button>
          <span className="text-muted">{offset + 1}–{Math.min(offset + limit, data.total)} з {num(data.total)}</span>
          <button disabled={offset + limit >= data.total} onClick={() => setOffset(offset + limit)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Наступні →</button>
        </div>
      )}
    </div>
  );
}
