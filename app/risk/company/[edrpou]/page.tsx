"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import RiskGraphView from "@/components/RiskGraph";
import SignalDetails from "@/components/SignalDetails";
import { fetchJson } from "@/lib/api";
import { Card, Skeleton } from "@/components/ui";
import { date, money, num, pct, riskBadgeClass, riskBarColor, riskLabel } from "@/lib/risk";
import { evaluateSignals, formatSignalValue, points, SignalResult } from "@/lib/explain";
import { CompanyEvidence, CompanyGroupSummary, FeatureNorms, CompanyHistoryItem, CompanyLinkItem, RiskCompany, RiskGraph } from "@/lib/types";
import { isWatched, toggleWatch } from "@/lib/watchlist";


export default function CompanyRiskPage() {
  const { edrpou } = useParams<{ edrpou: string }>();
  const router = useRouter();
  const [data, setData] = useState<RiskCompany | null>(null);
  const [graph, setGraph] = useState<RiskGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<CompanyLinkItem[]>([]);
  const [groups, setGroups] = useState<CompanyGroupSummary[]>([]);
  const [history, setHistory] = useState<CompanyHistoryItem[]>([]);
  const [watched, setWatched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [norms, setNorms] = useState<FeatureNorms | null>(null);
  const [evidence, setEvidence] = useState<CompanyEvidence | null>(null);
  const [evidenceFailed, setEvidenceFailed] = useState(false);
  const loadEvidence = useCallback(() => {
    setEvidenceFailed(false);
    fetchJson<CompanyEvidence>(`/api/risk/company/${edrpou}/evidence`)
      .then(setEvidence)
      .catch(() => setEvidenceFailed(true));
  }, [edrpou]);

  useEffect(() => {
    fetchJson<FeatureNorms>("/api/risk/feature-norms").then(setNorms).catch(() => setNorms(null));
  }, []);

  useEffect(() => {
    // reset then load on route param change; the synchronous reset is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setGraph(null);
    setError(null);
    fetchJson<RiskCompany>(`/api/risk/company/${edrpou}`).then(setData).catch((e) => setError(String(e)));
    fetchJson<RiskGraph>(`/api/risk/company/${edrpou}/graph?limit=300`).then(setGraph).catch(() => setGraph(null));
    setEvidence(null);
    loadEvidence();
    setLinks([]);
    setGroups([]);
    fetchJson<CompanyLinkItem[]>(`/api/risk/company/${edrpou}/links`).then(setLinks).catch(() => setLinks([]));
    fetchJson<CompanyGroupSummary[]>(`/api/risk/company/${edrpou}/groups`).then(setGroups).catch(() => setGroups([]));
    fetchJson<CompanyHistoryItem[]>(`/api/risk/company/${edrpou}/history`).then(setHistory).catch(() => setHistory([]));
    setWatched(isWatched("company", edrpou));
  }, [edrpou, loadEvidence]);

  const copyLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Скопіюйте посилання:", url);
    }
  };

  const onSelect = useCallback((id: string) => router.push(`/risk/company/${id}`), [router]);

  if (error) {
    const notFound = /404/.test(error);
    return (
      <div className="space-y-4">
        <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
        {notFound ? (
          <p className="rounded-2xl border border-warning-line bg-warning-soft p-5 text-sm text-warning">
            Компанію {edrpou} не знайдено серед учасників торгів у базі. Оцінка можлива лише для
            компаній, які подавали хоча б одну ставку.
          </p>
        ) : (
          <p className="rounded-2xl border border-danger-line bg-danger-soft p-5 text-sm text-danger">
            Не вдалося отримати дані з сервера ({error.replace("API error: ", "код ")}). Це не означає, що компанії немає:
            спробуйте оновити сторінку за хвилину.
          </p>
        )}
      </div>
    );
  }
  if (!data) return <Skeleton lines={6} className="max-w-2xl" />;

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>

      <header className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Картка компанії</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{data.name ?? data.edrpou}</h1>
          <p className="mt-1 text-sm text-muted">
            ЄДРПОУ {data.edrpou} · історія {data.coverage === "full" ? "повна" : data.coverage === "capped" ? "обрізана стелею порталу" : "часткова"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <button
              onClick={() => setWatched(toggleWatch({ type: "company", id: data.edrpou, name: data.name }))}
              className={`rounded-lg border px-3 py-1.5 font-semibold ${watched ? "border-ink bg-ink text-canvas" : "border-line bg-white text-ink hover:border-accent"}`}
            >
              {watched ? "✓ Стежу" : "Стежити"}
            </button>
            <button onClick={copyLink} className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink hover:border-accent">
              {copied ? "Скопійовано" : "Скопіювати посилання"}
            </button>
            <Link href="/risk/watch" className="self-center text-xs text-muted hover:text-ink">мої списки →</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 md:text-right">
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">Ризик змови на торгах</p>
          <p className="mt-2 text-4xl font-extrabold leading-none" style={{ color: riskBarColor(data.score) }}>{riskLabel(data.score)}</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {data.score < 0.01 ? "менше 1 бала" : points(Math.round(data.score * 100))} зі 100
          </p>
          {data.percentile >= 1 && (
            <p className="mt-1 text-sm text-muted">
              {data.percentile >= 50
                ? <>вище, ніж у {data.percentile.toFixed(0)} % компаній</>
                : <>нижче, ніж у {(100 - data.percentile).toFixed(0)} % компаній</>}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Бали показують, наскільки поведінка компанії на торгах схожа на поведінку фірм, яких АМКУ вже покарав за змову.
            Це привід перевірити, а не доказ.
          </p>
        </div>
      </header>

      {(() => {
        const sanctionedPartners = Math.max(
          data.coBidders.filter((p) => p.label).length,
          data.topNeighbors.filter((n) => n.label).length,
        );
        const results = evaluateSignals(data.features, { nTenders: data.nTenders, degree: data.degree, sanctionedPartners });
        const hits = results.filter((r) => r.hit).length;
        const groupNames = [...new Set(results.map((r) => r.signal.group))];
        const row = (r: SignalResult) => {
          const norm = r.signal.feature ? norms?.[r.signal.feature] : undefined;
          return (
            <li key={r.signal.id}>
              <details className={`group rounded-xl border text-sm ${r.hit ? "border-red-200 bg-red-50" : "border-line bg-white"}`}>
                <summary className="grid cursor-pointer list-none gap-1 px-3 py-2 sm:grid-cols-[1.5rem_1fr_6rem_7rem_1rem] sm:items-center sm:gap-3 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className={`font-bold ${r.hit ? "text-red-700" : "text-muted"}`}>{r.hit ? "!" : r.enoughData && r.value !== undefined ? "✓" : "·"}</span>
                  <div className="min-w-0">
                    <p className={`font-semibold ${r.hit ? "text-red-900" : "text-ink"}`}>{r.signal.title}</p>
                    <p className="text-xs text-muted">{r.signal.text} <span className="whitespace-nowrap">Поріг: {r.signal.threshold}.</span></p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted sm:hidden">у компанії </span>
                    <span className={`font-mono ${r.hit ? "font-bold text-red-800" : "text-ink"}`}>
                      {!r.enoughData ? "мало даних" : formatSignalValue(r.signal, r.value)}
                    </span>
                  </div>
                  <div className="text-xs text-muted sm:text-right">
                    {norm ? <>зазвичай {formatSignalValue(r.signal, norm.p50)}</> : r.signal.id === "sanctioned" ? "зазвичай 0" : ""}
                  </div>
                  <span aria-hidden className="hidden text-muted transition group-open:rotate-90 sm:block">›</span>
                  <span className="text-xs font-semibold text-accent sm:hidden">докладніше ›</span>
                </summary>
                <div className="border-t border-line/70 px-3 py-3 sm:pl-12">
                  <SignalDetails id={r.signal.id} data={data} evidence={evidence} evidenceFailed={evidenceFailed} onRetry={loadEvidence} links={links} groups={groups} />
                </div>
              </details>
            </li>
          );
        };
        return (
          <section id="signals" className="scroll-mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Перевірка за ознаками змови</h2>
              <p className="text-sm font-semibold text-ink">
                {hits ? <span className="text-red-800">спрацювало {hits} з {results.length}</span> : `жодна з ${results.length} ознак не спрацювала`}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              Кожен рядок — одна відома ознака змови на торгах. Модель рахує 38 показників; тут показано ті {results.length}, що є
              ознаками змови самі по собі. Решта (розмір мережі, кількість ринків, центральність тощо) лише описують компанію і
              окремо нічого не означають. «!» — компанія помітно відрізняється від звичайних (поріг приблизно на
              рівні верхніх 10 % ринку), «✓» — у межах норми, «·» — не вистачає даних. «Зазвичай» — медіана серед компаній з 10+ тендерами,
              яких АМКУ не карав. Натисніть на рядок, щоб побачити конкретних партнерів і тендери. Модель зважує всі показники
              і зв&apos;язки разом, тому бали ризику не дорівнюють кількості спрацьованих ознак.
              {evidence?.cutoff && <> Компанію вже покарано, тому враховано лише тендери до рішення від {date(evidence.cutoff)}</>}
            </p>
            <div className="mt-4 space-y-4">
              {groupNames.map((g) => (
                <div key={g}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink">{g}</p>
                  <ul className="space-y-1.5">{results.filter((r) => r.signal.group === g).map(row)}</ul>
                </div>
              ))}
            </div>
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

      <section id="graph" className="scroll-mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">З ким ходить на торги</h2>
        <p className="mb-3 text-xs text-muted">
          Компанія в центрі, навколо — усі, з ким вона зустрічалась на торгах{data.degree > 300 ? ` (показано 300 найчастіших із ${num(data.degree)})` : ""}.
          Чим більше спільних тендерів, тим ближче партнер до центру і тим більше коло. Наведіть на коло, щоб побачити подробиці;
          знак «!» означає, що партнер уже покараний.
        </p>
        {graph ? <RiskGraphView graph={graph} onSelect={onSelect} height={720} /> : <p className="text-sm text-muted">Граф завантажується…</p>}
      </section>

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

      {links.length > 0 && (
        <Card title="Пов’язані компанії: спільні контакти">
          <p className="mb-3 text-xs text-muted">
            Ці компанії вказали в картках учасника той самий телефон, пошту, контактну особу або адресу. Спільний телефон у двох
            «конкурентів» майже завжди означає одну групу людей: серед таких пар дві третини вже названі в одному рішенні АМКУ.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {links.map((l) => (
              <li key={l.edrpou} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <Link href={`/risk/company/${l.edrpou}`} className="font-semibold text-ink hover:text-accent">{l.name ?? l.edrpou}</Link>
                  <div className="text-xs text-muted">
                    спільні: {l.kinds.map((k) => ({ phone: "телефон", email: "пошта", person: "контактна особа", address: "адреса" })[k] ?? k).join(", ")}
                    {l.sharedTenders ? ` · ${num(l.sharedTenders)} спільних тендерів` : ""}
                    {l.label ? <span className="ml-1 font-semibold text-red-700">· уже покарана</span> : null}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(l.score)}`}>{pct(l.score)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {groups.length > 0 && (
        <Card title="Входить у групи, що ходять на торги разом">
          <p className="mb-3 text-xs text-muted">Група — кілька компаній, які зустрічаються на торгах переважно одна з одною і майже не мають інших конкурентів.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/risk/groups/${g.id}`} className="font-semibold text-ink hover:text-accent">Група № {g.id}: {g.size} компаній</Link>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(g.maxScore)}`}>до {pct(g.maxScore)}</span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {num(g.sharedTenders)} спільних тендерів{g.sanctioned ? ` · покараних у групі: ${g.sanctioned}` : ""}
                </div>
                <div className="mt-1 truncate text-xs text-muted">{g.members.filter((m) => m.edrpou !== data.edrpou).map((m) => m.name ?? m.edrpou).join(", ")}</div>
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

      {history.length > 0 && (
        <Card title="Як сервіс оцінював цю компанію раніше">
          <p className="mb-3 text-xs text-muted">
            Оцінки із «перевірки на минулому»: що сервіс сказав би про компанію на кожну дату зрізу, знаючи лише тодішні
            тендери й рішення АМКУ. Місце рахується серед компаній з повною історією і від 5 тендерів, які ще не були в реєстрі.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="py-2 pr-4">Дата зрізу</th><th className="py-2 pr-4">Тендерів тоді</th><th className="py-2 pr-4">Місце у списку</th><th className="py-2">Примітка</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.cutoffYear} className="border-t border-line">
                    <td className="py-2 pr-4">{h.cutoffDate ? date(h.cutoffDate) : `31.12.${h.cutoffYear}`}</td>
                    <td className="py-2 pr-4 font-mono">{num(h.nTenders)}</td>
                    <td className="py-2 pr-4 font-mono">{h.position ? `${num(h.position)} з ${num(h.population ?? 0)}` : "—"}</td>
                    <td className="py-2 text-xs text-muted">
                      {h.note ?? (h.position && h.population && h.position <= h.population * 0.1 ? "у верхніх 10 % списку" : h.position ? "поза верхівкою списку" : "")}
                      {h.outcome === "caught" && h.firstDecision ? ` · АМКУ покарав ${date(h.firstDecision)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Різні дати можуть давати дуже різні місця: поки історія компанії коротка, оцінка нестійка і залежить від кількох партнерів.</p>
        </Card>
      )}

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
