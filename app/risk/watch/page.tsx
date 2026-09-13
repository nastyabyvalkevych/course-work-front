"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { date, money, num, pct, riskBadgeClass, riskLabel } from "@/lib/risk";
import { RiskCompany, WatchItem } from "@/lib/types";
import { readWatchlist, writeWatchlist } from "@/lib/watchlist";

type BuyerLite = {
  name: string | null;
  region: string | null;
  tenders: number;
  singleBidderShare: number;
  twoBidderShare: number;
  signals: { highRiskSuppliers: number; sanctionedSuppliers: number; repeatedPairs: number };
  recentTenders: { id: number; tenderID: string | null; title: string | null; datePublished: string | null; valueAmount: number | null; bidders: number; winner: string | null; winnerScore: number | null }[];
};

type Loaded = { company?: RiskCompany; buyer?: BuyerLite; error?: string };

const isNew = (d: string | null | undefined, lastSeen: string | undefined) => !!d && !!lastSeen && new Date(d).getTime() > new Date(lastSeen).getTime();

export default function WatchPage() {
  const [items, setItems] = useState<WatchItem[] | null>(null);
  const [data, setData] = useState<Record<string, Loaded>>({});
  const [io, setIo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
     
    setItems(readWatchlist());
  }, []);

  useEffect(() => {
    if (!items) return;
    items.forEach((it) => {
      const key = `${it.type}:${it.id}`;
      if (data[key]) return;
      const url = it.type === "company" ? `/api/risk/company/${it.id}` : `/api/risk/buyer/${it.id}`;
      fetchJson<RiskCompany | BuyerLite>(url)
        .then((r) => setData((d) => ({ ...d, [key]: it.type === "company" ? { company: r as RiskCompany } : { buyer: r as BuyerLite } })))
        .catch((e) => setData((d) => ({ ...d, [key]: { error: String(e) } })));
    });
  }, [items, data]);

  const save = (next: WatchItem[]) => {
    writeWatchlist(next);
    setItems(next);
  };
  const remove = (it: WatchItem) => save((items ?? []).filter((w) => !(w.type === it.type && w.id === it.id)));
  const markSeen = (it: WatchItem) => save((items ?? []).map((w) => (w.type === it.type && w.id === it.id ? { ...w, lastSeen: new Date().toISOString() } : w)));
  const exportList = () => setIo(JSON.stringify(items ?? [], null, 2));
  const importList = () => {
    try {
      const parsed = JSON.parse(io) as WatchItem[];
      if (!Array.isArray(parsed)) throw new Error("не список");
      save(parsed.filter((p) => p && (p.type === "company" || p.type === "buyer") && typeof p.id === "string"));
      setMsg("Список імпортовано.");
    } catch (e) {
      setMsg(`Не вдалося прочитати: ${String(e)}`);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Стеження</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Мої списки</h1>
        <p className="max-w-3xl text-base text-muted">
          Компанії та замовники, за якими ви стежите. Список зберігається тільки у вашому браузері, на сервер нічого не
          надсилається. Нові тендери після вашого останнього перегляду позначені «нове».
        </p>
      </header>

      {items && items.length === 0 && (
        <section className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
          <p className="font-semibold text-ink">Список порожній.</p>
          <p className="mt-2">
            Відкрийте <Link href="/risk" className="text-accent">картку компанії</Link> або замовника і натисніть «Стежити». Вона з’явиться тут разом з останніми тендерами.
          </p>
        </section>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((it) => {
            const d = data[`${it.type}:${it.id}`];
            const href = it.type === "company" ? `/risk/company/${it.id}` : `/risk/buyer/${it.id}`;
            return (
              <section key={`${it.type}:${it.id}`} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">{it.type === "company" ? "Компанія" : "Замовник"}</p>
                    <Link href={href} className="text-lg font-bold text-ink hover:text-accent">{d?.company?.name ?? d?.buyer?.name ?? it.name ?? it.id}</Link>
                    <p className="font-mono text-xs text-muted">{it.id} · додано {date(it.addedAt)}{it.lastSeen ? ` · переглянуто ${date(it.lastSeen)}` : ""}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => markSeen(it)} className="rounded-lg border border-line px-3 py-1 hover:bg-white">позначити переглянутим</button>
                    <button onClick={() => remove(it)} className="rounded-lg border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50">прибрати</button>
                  </div>
                </div>

                {!d && <p className="mt-3 text-sm text-muted">Завантаження…</p>}
                {d?.error && <p className="mt-3 text-sm text-amber-800">Не вдалося завантажити: {d.error}</p>}

                {d?.company && (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(d.company.score)}`}>{pct(d.company.score)} · {riskLabel(d.company.score)}</span>
                      <span className="text-muted">{num(d.company.nTenders)} тендерів, перемог {pct(d.company.winRate)}</span>
                      {d.company.label && <span className="text-xs font-semibold text-red-700">уже покарана АМКУ</span>}
                    </div>
                    <ul className="mt-3 divide-y divide-line text-sm">
                      {d.company.recentTenders.slice(0, 5).map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <Link href={`/risk/tender/${t.tenderID ?? t.id}`} className="font-semibold text-ink hover:text-accent">{t.title ?? t.tenderID}</Link>
                            {isNew(t.datePublished, it.lastSeen) && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-red-800">нове</span>}
                            <div className="truncate text-xs text-muted">{t.procuringEntity} · {date(t.datePublished)}</div>
                          </div>
                          <div className="text-right text-xs text-muted">{money(t.valueAmount)} · {t.bidders} учасн.{t.won ? " · перемога" : ""}</div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {d?.buyer && (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                      <span>{num(d.buyer.tenders)} тендерів</span>
                      <span>один учасник у {pct(d.buyer.singleBidderShare)}</span>
                      <span>«удвох» у {pct(d.buyer.twoBidderShare)}</span>
                      {d.buyer.signals.sanctionedSuppliers > 0 && <span className="font-semibold text-red-700">покараних постачальників: {d.buyer.signals.sanctionedSuppliers}</span>}
                    </div>
                    <ul className="mt-3 divide-y divide-line text-sm">
                      {d.buyer.recentTenders.slice(0, 5).map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <Link href={`/risk/tender/${t.tenderID ?? t.id}`} className="font-semibold text-ink hover:text-accent">{t.title ?? t.tenderID}</Link>
                            {isNew(t.datePublished, it.lastSeen) && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-red-800">нове</span>}
                            <div className="truncate text-xs text-muted">{date(t.datePublished)} · переможець: {t.winner ?? "—"}</div>
                          </div>
                          <div className="text-right text-xs text-muted">{money(t.valueAmount)} · {t.bidders} учасн.</div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Перенести список на інший пристрій</h2>
        <p className="mt-1 text-xs text-muted">«Експортувати» покаже список текстом, скопіюйте його. На іншому пристрої вставте текст і натисніть «Імпортувати».</p>
        <textarea value={io} onChange={(e) => setIo(e.target.value)} rows={6} className="mt-3 w-full rounded-lg border border-line bg-surface p-3 font-mono text-xs" />
        <div className="mt-2 flex gap-2 text-sm">
          <button onClick={exportList} className="rounded-lg border border-line px-3 py-1 hover:bg-surface">Експортувати</button>
          <button onClick={importList} className="rounded-lg bg-ink px-3 py-1 font-semibold text-canvas hover:bg-accent">Імпортувати</button>
          {msg && <span className="self-center text-xs text-muted">{msg}</span>}
        </div>
      </section>
    </div>
  );
}
