"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { reasonsCompany, verdictCompany } from "@/lib/explain";
import { date, num, pct, riskBadgeClass, riskLabel } from "@/lib/risk";
import { RiskCompany, RiskRanking } from "@/lib/types";

function Example({ n, title, tone, children }: { n: number; title: string; tone: "red" | "amber" | "green"; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-red-200 bg-red-50/40" : tone === "amber" ? "border-amber-200 bg-amber-50/40" : "border-green-200 bg-green-50/40";
  return (
    <section className={`rounded-2xl border-2 p-6 ${cls}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Приклад {n}</p>
      <h2 className="mt-1 text-xl font-extrabold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-muted">{children}</div>
    </section>
  );
}

function CompanyBrief({ c }: { c: RiskCompany }) {
  const v = verdictCompany(c);
  const reasons = reasonsCompany(c).slice(0, 3);
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/risk/company/${c.edrpou}`} className="font-bold text-ink hover:text-accent">{c.name ?? c.edrpou}</Link>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(c.score)}`}>{pct(c.score)} · {riskLabel(c.score)}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{num(c.nTenders)} тендерів · перемог {pct(c.winRate)} · партнерів {num(c.degree)} · замовників {num(c.features.n_buyers)}</p>
      <p className="mt-2 font-semibold text-ink">{v.title}</p>
      <ul className="mt-2 space-y-1">
        {reasons.map((r) => (
          <li key={r.title} className="text-sm">
            <span className={r.kind === "up" ? "text-red-700" : r.kind === "down" ? "text-green-700" : "text-muted"}>{r.kind === "up" ? "▲" : r.kind === "down" ? "▼" : "●"}</span>{" "}
            <span className="text-ink">{r.title}.</span> <span className="text-muted">{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const GLOSSARY: [string, string][] = [
  ["Ризик", "Число від 0 до 100 %. Показує, наскільки історія торгів компанії схожа на історії компаній, яких АМКУ покарав за змову. Не доказ і не звинувачення."],
  ["Покарана", "Компанія є в реєстрі рішень Антимонопольного комітету про змову на торгах. Це підтверджений факт, а не наша оцінка."],
  ["Повна історія", "Ми забрали з Prozorro всі тендери компанії. Якщо історія часткова, ми бачимо лише ті тендери, де вона перетиналась з іншими, і оцінка менш надійна."],
  ["Партнер по торгах", "Компанія, яка подавала ставку в тому ж тендері. Не обов’язково спільник: конкуренти теж партнери по торгах."],
  ["«Удвох»", "Тендер, у якому було рівно два учасники. Мінімум, щоб торги відбулися. Якщо ті самі двоє зустрічаються постійно і виграє завжди один, це типова картина змови."],
  ["Прикриття", "Компанія бере участь, щоб торги виглядали конкурентними, але завжди програє одному й тому ж партнеру."],
  ["Група", "Кілька компаній, які ходять на торги переважно разом і майже не зустрічають інших конкурентів."],
  ["Перевірка на минулому", "Ми даємо сервісу дані лише до кінця року і дивимось, кого АМКУ покарав потім. Так перевіряємо, чи оцінки чогось варті."],
];

export default function GuidePage() {
  const [sanctioned, setSanctioned] = useState<RiskCompany | null>(null);
  const [highRisk, setHighRisk] = useState<RiskCompany | null>(null);
  const [leader, setLeader] = useState<RiskCompany | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<RiskCompany>("/api/risk/company/24411216").then(setSanctioned).catch((e) => setErr(String(e)));
    fetchJson<RiskRanking>("/api/risk/ranking?limit=1&minTenders=20&excludeKnown=1&fullCoverageOnly=1")
      .then((r) => (r.items[0] ? fetchJson<RiskCompany>(`/api/risk/company/${r.items[0].edrpou}`) : null))
      .then((c) => c && setHighRisk(c))
      .catch(() => null);
    fetchJson<RiskRanking>("/api/risk/ranking?limit=50&minTenders=50&excludeKnown=1")
      .then(async (r) => {
        // the candidate with the most different buyers is most likely a genuine market leader
        const cards = await Promise.all(r.items.slice(0, 15).map((i) => fetchJson<RiskCompany>(`/api/risk/company/${i.edrpou}`).catch(() => null)));
        const best = cards.filter((c): c is RiskCompany => !!c).sort((a, b) => (b.features.n_buyers ?? 0) - (a.features.n_buyers ?? 0))[0];
        if (best) setLeader(best);
      })
      .catch(() => null);
  }, []);

  const medintech = sanctioned?.coBidders.find((p) => p.edrpou === "37960831");

  return (
    <div className="space-y-8">
      <Link href="/risk" className="text-sm text-muted hover:text-ink">← До рейтингу</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Інструкція</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Як читати цей сайт</h1>
        <p className="max-w-3xl text-base text-muted">
          Три живі приклади з бази і короткий словник. Числа на цій сторінці беруться з сервісу зараз, тому можуть трохи
          змінюватись з оновленням даних.
        </p>
      </header>

      {err && <p className="text-sm text-red-700">{err}</p>}

      <Example n={1} title="Компанія, яку АМКУ покарав. Як це виглядало заздалегідь" tone="red">
        <p>
          ПП «Фотоніка Плюс» з Черкаської області. Рішення АМКУ про змову вийшло 22 квітня 2024 року. Усі числа нижче
          пораховано лише за тендерами до цієї дати, тобто так, як їх бачив би аудитор за день до рішення.
        </p>
        {sanctioned ? (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Виграла {pct(sanctioned.winRate)} тендерів: {num(sanctioned.nWon)} з {num(sanctioned.nTenders)}. Так часто виграють лідери ринку або ті, кому підіграють.</li>
              {medintech && (
                <li>
                  Найчастіший партнер — {medintech.name}: {medintech.sharedTenders} спільних тендерів, з них «Фотоніка» виграла {medintech.weWon}, партнер — {medintech.theyWon}.
                  {medintech.theyWon === 0 ? " Партнер не виграв жодного разу. Так виглядає прикриття." : ""}
                  {medintech.label ? " Партнер теж є в реєстрі АМКУ." : ""}
                </li>
              )}
              <li>Партнерів по торгах усього {num(sanctioned.degree)} за {num(sanctioned.nTenders)} тендерів: вузьке коло суперників.</li>
            </ul>
            <CompanyBrief c={sanctioned} />
            <p>
              Головний урок: жодна з ознак окремо не є доказом. Але разом — часті перемоги, партнер, який ніколи не виграє, і вузьке коло —
              це саме той малюнок, який АМКУ згодом підтвердив рішенням {sanctioned.decisions[0] ? `№ ${sanctioned.decisions[0].decisionNumber} від ${date(sanctioned.decisions[0].decisionDate)}` : ""}.
            </p>
          </>
        ) : <p>Завантаження…</p>}
      </Example>

      <Example n={2} title="Компанія з високим ризиком, рішення ще немає" tone="amber">
        <p>
          Це компанія з верхівки нашого рейтингу: повна історія, не менше 20 тендерів, у реєстрі АМКУ її нема. Саме такі
          випадки сайт і має показувати: сервіс каже «перевірте першою», а що там насправді, вирішує перевірка.
        </p>
        {highRisk ? <CompanyBrief c={highRisk} /> : <p>Завантаження…</p>}
        <p>
          Як діяти журналісту чи аудитору: відкрити картку, подивитись на партнерів і їхні перемоги, перевірити спільні контакти
          і групи, потім підняти документи кількох спільних тендерів. Число на картці — лише привід почати.
        </p>
      </Example>

      <Example n={3} title="Обережно: високий ризик, але схоже на справжнього лідера ринку" tone="green">
        <p>
          Не кожна компанія з високим числом — змовник. Ось компанія з рейтингу, яка має найбільше різних замовників серед
          верхівки. Багато замовників і багато різних суперників зазвичай означають реальну конкуренцію: компанія просто
          велика і часто виграє.
        </p>
        {leader ? (
          <>
            <CompanyBrief c={leader} />
            <p>
              Тут {num(leader.features.n_buyers)} різних замовників і {num(leader.degree)} різних суперників. Змовницькі групи так не виглядають: у них
              коло вузьке. Тому високе число саме по собі не є доказом, і саме для цього на картці є пояснення «чому такий ризик».
            </p>
          </>
        ) : <p>Завантаження…</p>}
      </Example>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xl font-extrabold text-ink">Словник</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {GLOSSARY.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-line bg-white p-4">
              <dt className="font-semibold text-ink">{t}</dt>
              <dd className="mt-1 text-sm text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
        <p className="font-semibold text-ink">Три правила</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Число — привід перевірити, а не висновок.</li>
          <li>«Без рішення» не означає «чесна»: АМКУ перевіряє малу частку ринку.</li>
          <li>Дивіться на партнерів, а не лише на компанію. Змова завжди між кількома.</li>
        </ul>
      </section>
    </div>
  );
}
