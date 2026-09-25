"use client";

import Link from "next/link";
import { useState } from "react";

import { tenders } from "@/lib/explain";
import { date, money, num, pct, riskBadgeClass } from "@/lib/risk";
import { CompanyEvidence, CompanyGroupSummary, CompanyLinkItem, EvidenceTender, RiskCompany } from "@/lib/types";

const KIND: Record<string, string> = { phone: "телефон", email: "пошта", person: "контактна особа", address: "адреса" };

function CompanyRow({ edrpou, name, score, label, note }: { edrpou: string; name: string | null; score?: number | null; label?: boolean | null; note: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm">
      <div className="min-w-0">
        <Link href={`/risk/company/${edrpou}`} className="font-semibold text-ink hover:text-accent">{name ?? edrpou}</Link>
        <div className="text-xs text-muted">
          {note}
          {label ? <span className="ml-1 font-semibold text-red-700">· уже покарана АМКУ</span> : null}
        </div>
      </div>
      {score !== undefined && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(score)}`}>{pct(score)}</span>}
    </li>
  );
}

const winnerText = (w: EvidenceTender["winner"], partnerName: string) =>
  w === "self" ? <span className="font-semibold text-ink">ця компанія</span> : w === "partner" ? <span className="font-semibold text-red-800">{partnerName}</span> : w === "other" ? "інший учасник" : "—";

/** Concrete tenders behind a signal; the partner columns appear only for pair signals. */
function TenderTable({ rows, partnerName, mode }: { rows: EvidenceTender[]; partnerName?: string; mode: "plain" | "pair" | "time" | "gap" | "cv" }) {
  const [all, setAll] = useState(false);
  if (!rows.length) return <p className="text-xs text-muted">Прикладів не знайдено.</p>;
  const shown = all ? rows : rows.slice(0, 5);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left uppercase tracking-wider text-muted">
          <tr>
            <th className="py-1.5 pr-3">Тендер</th>
            <th className="py-1.5 pr-3">Очікувана вартість</th>
            <th className="py-1.5 pr-3">Ставка компанії</th>
            {mode !== "plain" && <th className="py-1.5 pr-3">Ставка партнера</th>}
            {mode === "pair" && <th className="py-1.5 pr-3">Різниця</th>}
            {mode === "time" && <th className="py-1.5 pr-3">Між ставками</th>}
            {mode === "gap" && <th className="py-1.5 pr-3">Дві найнижчі ставки</th>}
            {mode === "cv" && <th className="py-1.5 pr-3">Розкид ставок</th>}
            <th className="py-1.5 pr-3">Учасників</th>
            <th className="py-1.5">Переміг</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((t) => (
            <tr key={t.id} className="border-t border-line align-top">
              <td className="max-w-xs py-1.5 pr-3">
                <Link href={`/risk/tender/${t.tenderID ?? t.id}`} title={t.title ?? undefined} className="line-clamp-2 font-semibold text-ink hover:text-accent">{t.title ?? t.tenderID ?? `#${t.id}`}</Link>
                <div className="truncate text-muted">{date(t.datePublished)} · {t.buyer}</div>
              </td>
              <td className="whitespace-nowrap py-1.5 pr-3">{money(t.valueAmount)}</td>
              <td className="whitespace-nowrap py-1.5 pr-3">
                {money(t.amount)}
                {t.amount && t.valueAmount ? <div className="text-muted">{pct(t.amount / t.valueAmount)} від очікуваної</div> : null}
              </td>
              {mode !== "plain" && <td className="whitespace-nowrap py-1.5 pr-3">{money(t.partnerAmount)}</td>}
              {mode === "pair" && (
                <td className="whitespace-nowrap py-1.5 pr-3">
                  {t.amount && t.partnerAmount && t.valueAmount ? pct(Math.abs(t.amount - t.partnerAmount) / t.valueAmount, 2) : "—"}
                </td>
              )}
              {mode === "time" && (
                <td className="whitespace-nowrap py-1.5 pr-3">{t.minutesToPartner === null ? "—" : t.minutesToPartner < 1 ? "< 1 хв" : `${Math.round(t.minutesToPartner)} хв`}</td>
              )}
              {mode === "gap" && (
                <td className="whitespace-nowrap py-1.5 pr-3">
                  {money(t.minAmount)} і {money(t.secondAmount)}
                  {t.minAmount && t.secondAmount ? <div className="text-muted">різниця {pct((t.secondAmount - t.minAmount) / t.minAmount, 2)}</div> : null}
                </td>
              )}
              {mode === "cv" && <td className="whitespace-nowrap py-1.5 pr-3">{t.cv === null ? "—" : pct(t.cv, 1)}</td>}
              <td className="py-1.5 pr-3">{t.bidders}</td>
              <td className="py-1.5">{winnerText(t.winner, partnerName ?? "партнер")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown.length && (
        <button onClick={() => setAll(true)} className="mt-2 text-xs font-semibold text-accent">показати ще {rows.length - shown.length}</button>
      )}
    </div>
  );
}

function Count({ n, of, what }: { n: number; of: number; what: string }) {
  return <p className="mb-2 text-xs text-muted"><b className="text-ink">{num(n)}</b> з {tenders(of)} — {what}. Нижче найсвіжіші приклади; назва тендеру відкриває його перевірку.</p>;
}

/**
 * The "look closer" part of a checklist row: who the partners are, which tenders
 * triggered the signal, with links to the partner cards and tender pages.
 */
export default function SignalDetails({
  id,
  data,
  evidence,
  evidenceFailed = false,
  onRetry,
  links,
  groups,
}: {
  id: string;
  data: RiskCompany;
  evidence: CompanyEvidence | null;
  evidenceFailed?: boolean;
  onRetry?: () => void;
  links: CompanyLinkItem[];
  groups: CompanyGroupSummary[];
}) {
  const partner = evidence?.partner;
  const partnerName = partner?.name ?? partner?.edrpou ?? "партнер";
  const partnerRow = partner && (
    <ul className="mb-3">
      <CompanyRow edrpou={partner.edrpou} name={partner.name} score={partner.score} label={partner.label}
        note={<>головний партнер · {tenders(partner.sharedTenders)} разом · виграла ця компанія {partner.pairWonSelf}, партнер {partner.pairWonPartner}</>} />
    </ul>
  );
  const needEvidence = !["sanctioned", "linked", "tight_group", "closed_circle", "local"].includes(id);
  if (needEvidence && !evidence && evidenceFailed) {
    return (
      <p className="text-xs text-red-800">
        Не вдалося завантажити приклади тендерів: сервер не відповів.{" "}
        {onRetry && <button onClick={onRetry} className="font-semibold text-accent">Спробувати ще раз</button>}
      </p>
    );
  }
  if (needEvidence && !evidence) return <p className="text-xs text-muted">Завантаження прикладів…</p>;
  const ev = evidence?.signals;
  const total = evidence?.tenders ?? data.nTenders;

  switch (id) {
    case "sanctioned": {
      const seen = new Set<string>();
      const list = [
        ...data.coBidders.filter((p) => p.label).map((p) => ({ edrpou: p.edrpou, name: p.name, score: p.score, note: <>{tenders(p.sharedTenders)} разом · виграла ця компанія {p.weWon}, партнер {p.theyWon}</> })),
        ...data.topNeighbors.filter((n) => n.label).map((n) => ({ edrpou: n.edrpou, name: n.name, score: n.score, note: <>{tenders(n.weight)} разом</> })),
      ].filter((p) => !seen.has(p.edrpou) && seen.add(p.edrpou));
      return list.length ? (
        <ul className="space-y-1.5">{list.map((p) => <CompanyRow key={p.edrpou} {...p} label />)}</ul>
      ) : <p className="text-xs text-muted">Серед постійних партнерів покараних немає.</p>;
    }
    case "linked":
      return links.length ? (
        <ul className="space-y-1.5">
          {links.map((l) => (
            <CompanyRow key={l.edrpou} edrpou={l.edrpou} name={l.name} score={l.score} label={l.label}
              note={<>спільні: {l.kinds.map((k) => KIND[k] ?? k).join(", ")}{l.sharedTenders ? ` · ${tenders(l.sharedTenders)} разом` : " · разом не торгувались"}</>} />
          ))}
        </ul>
      ) : <p className="text-xs text-muted">Компаній зі спільними контактами не знайдено.</p>;
    case "tight_group":
      return groups.length ? (
        <ul className="space-y-1.5">
          {groups.map((g) => (
            <li key={g.id} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
              <Link href={`/risk/groups/${g.id}`} className="font-semibold text-ink hover:text-accent">Група № {g.id}: {g.size} компаній, {num(g.sharedTenders)} спільних тендерів</Link>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {g.members.filter((m) => m.edrpou !== data.edrpou).map((m) => (
                  <Link key={m.edrpou} href={`/risk/company/${m.edrpou}`} className={m.label ? "font-semibold text-red-700 hover:text-accent" : "text-muted hover:text-accent"}>{m.name ?? m.edrpou}{m.label ? " (покарана)" : ""}</Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-muted">Групу не знайдено.</p>;
    case "closed_circle":
      return <p className="text-xs text-muted">Подивіться на <a href="#graph" className="font-semibold text-accent">граф партнерів</a>: сірі лінії між колами — суперники, які теж зустрічались між собою. Чим густіша сітка, тим замкненіше коло.</p>;
    case "near_identical":
      return <>{partnerRow}<Count n={ev!.near_identical.count} of={ev!.with_partner.count} what="спільних тендерів, де ставки різняться менше ніж на 1 % очікуваної вартості" /><TenderTable rows={ev!.near_identical.examples} partnerName={partnerName} mode="pair" /></>;
    case "fast_bids":
      return <>{partnerRow}<Count n={ev!.fast_bids.count} of={ev!.with_partner.count} what="спільних тендерів, де ставки подано з різницею не більше години" /><TenderTable rows={ev!.fast_bids.examples} partnerName={partnerName} mode="time" /></>;
    case "local":
      return <p className="text-xs text-muted">Порівнюється область реєстрації компанії з областю замовника в кожному тендері та з областями її суперників. Регіони партнерів видно в їхніх картках.</p>;
    case "small_gap":
      return <><Count n={ev!.small_gap.count} of={total} what="тендерів, де друга найнижча ставка вища за першу не більше ніж на 2 %" /><TenderTable rows={ev!.small_gap.examples} mode="gap" /></>;
    case "similar_bids":
      return <><Count n={ev!.similar_bids.count} of={total} what="тендерів, де ставки всіх учасників різняться в середньому не більше ніж на 3 %" /><TenderTable rows={ev!.similar_bids.examples} mode="cv" /></>;
    case "round_bids":
      return <><Count n={ev!.round_bids.count} of={total} what="ставок, кратних 1000 грн" /><TenderTable rows={ev!.round_bids.examples} mode="plain" /></>;
    case "single_bidder":
      return <><Count n={ev!.single_bidder.count} of={total} what="тендерів, де компанія була єдиним учасником" /><TenderTable rows={ev!.single_bidder.examples} mode="plain" /></>;
    case "exclusive_pair":
    case "win_imbalance":
    case "top_partner":
      return <>{partnerRow}<Count n={ev!.with_partner.count} of={total} what="тендерів разом із головним партнером" /><TenderTable rows={ev!.with_partner.examples} partnerName={partnerName} mode="pair" /></>;
    case "two_bidders":
    case "two_bidder_excess":
      return <><Count n={ev!.two_bidders.count} of={total} what="тендерів з рівно двома учасниками" /><TenderTable rows={ev!.two_bidders.examples} mode="plain" /></>;
    case "cover_bids":
      return <><Count n={ev!.cover_bids.count} of={total} what="ставок на рівні 99 % очікуваної вартості або вище" /><TenderTable rows={ev!.cover_bids.examples} mode="plain" /></>;
    case "lost_cheapest":
      return <><Count n={ev!.lost_cheapest.count} of={total} what="тендерів, де ставка компанії була найнижчою, але переміг інший" /><TenderTable rows={ev!.lost_cheapest.examples} mode="plain" /></>;
    case "won_not_cheapest":
      return <><Count n={ev!.won_not_cheapest.count} of={total} what="перемог із ціною вищою за найнижчу ставку" /><TenderTable rows={ev!.won_not_cheapest.examples} mode="plain" /></>;
    case "win_rate":
    case "own_buyer":
    case "own_buyers":
    case "two_bidder_buyers":
      return (
        <ul className="space-y-1.5">
          {id === "win_rate" && <p className="text-xs text-muted">Перемог: <b className="text-ink">{num(data.nWon)}</b> з {tenders(data.nTenders)}. Головні замовники:</p>}
          {evidence!.topBuyers.map((b) => (
            <li key={b.name} className="flex justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm">
              <span className="min-w-0 text-ink">{b.name}</span>
              <span className="shrink-0 text-xs text-muted">{tenders(b.tenders)} · виграла {b.won}</span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}
