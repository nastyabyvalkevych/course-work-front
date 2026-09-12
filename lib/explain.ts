/**
 * Plain-language explanations of risk for people who are not analysts.
 * Everything here is derived from data the API already returns; no maths words.
 */
import { RiskCompany, RiskTender } from "./types";

export type Reason = {
  kind: "up" | "down" | "info";
  title: string;
  text: string;
};

const pctText = (v: number) => `${Math.round(v * 100)} %`;
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};
export const tenders = (n: number) => `${n} ${plural(n, "тендер", "тендери", "тендерів")}`;
const times = (n: number) => `${n} ${plural(n, "раз", "рази", "разів")}`;

export function verdictCompany(c: RiskCompany): { title: string; text: string } {
  const s = c.score;
  if (c.label) return { title: "Компанія вже покарана АМКУ", text: "Вона є у реєстрі рішень про змову на торгах. Оцінка нижче показує, чи схожа її історія на історії інших покараних, і з ким вона торгувала." };
  if (c.nTenders < 5) return { title: "Замало історії для впевненої оцінки", text: `Компанія має лише ${tenders(c.nTenders)} зі ставками. Модель бачила її мало, тому число ризику тут скоріше орієнтир, ніж висновок.` };
  if (s >= 0.7) return { title: "Історія дуже схожа на історії покараних компаній", text: "Модель бачила такі ж малюнки поведінки і зв'язків у компаній, яких АМКУ карав за змову. Це підстава подивитись уважніше, а не доказ порушення." };
  if (s >= 0.45) return { title: "Є окремі ознаки, схожі на змову", text: "Частина показників і зв'язків нагадують покараних, частина — звичайних учасників. Варто перевірити партнерів по торгах, наведених нижче." };
  return { title: "Історія схожа на звичайного учасника ринку", text: "Модель не знайшла помітної схожості з покараними компаніями. Це не гарантія чесності: АМКУ перевіряє малу частку ринку." };
}

export function reasonsCompany(c: RiskCompany): Reason[] {
  const f = c.features;
  const out: Reason[] = [];
  const contrib = new Map(c.contributions.map((x) => [x.feature, x.contribution]));
  const dir = (feature: string, fallback: Reason["kind"] = "info"): Reason["kind"] => {
    const v = contrib.get(feature);
    if (v === undefined || Math.abs(v) < 0.05) return fallback;
    return v > 0 ? "up" : "down";
  };
  const n = c.nTenders;

  if (n >= 10 && c.winRate >= 0.7) {
    out.push({ kind: dir("win_rate", "up"), title: `Виграє ${pctText(c.winRate)} своїх тендерів`,
      text: `Перемога у ${c.nWon} з ${tenders(n)}. Так часто виграють або справжні лідери ринку, або ті, кому суперники підіграють. Саме по собі це не порушення, але в поєднанні з постійними партнерами — ознака.` });
  } else if (n >= 10 && c.winRate <= 0.1 && c.winRate >= 0) {
    out.push({ kind: dir("win_rate", "info"), title: "Майже ніколи не виграє",
      text: `Лише ${c.nWon} перемог у ${tenders(n)}. Компанія, що роками бере участь і майже не виграє, іноді існує лише щоб «створити конкуренцію» для партнера.` });
  }
  if (f.share_two_bidders !== undefined && n >= 10 && f.share_two_bidders >= 0.5) {
    out.push({ kind: dir("share_two_bidders", "up"), title: `У ${pctText(f.share_two_bidders)} тендерів було рівно два учасники`,
      text: "Типовий малюнок змови: один виграє, другий формально програє, щоб торги відбулися. Чим більша ця частка, тим підозріліше." });
  }
  if (f.share_cover_bids !== undefined && n >= 10 && f.share_cover_bids >= 0.3) {
    out.push({ kind: dir("share_cover_bids", "up"), title: `У ${pctText(f.share_cover_bids)} тендерів програвала одному й тому ж партнеру`,
      text: "Постійні поразки одній і тій самій компанії схожі на «прикриття»: участь заради того, щоб партнер виграв." });
  }
  if (f.single_bidder_share !== undefined && n >= 10 && f.single_bidder_share >= 0.5) {
    out.push({ kind: dir("single_bidder_share", "info"), title: `У ${pctText(f.single_bidder_share)} тендерів була єдиним учасником`,
      text: "Торги без конкурентів. Це може бути вузький ринок, а може бути домовленість із замовником. Для змови між учасниками цей показник менш важливий, бо змовникам потрібні хоча б двоє." });
  }
  const cb = [...c.coBidders].sort((a, b) => b.sharedTenders - a.sharedTenders);
  const top = cb[0];
  if (top && top.sharedTenders >= 3) {
    const name = top.name ?? top.edrpou;
    let text = `${top.sharedTenders} спільних тендерів. З них ця компанія виграла ${top.weWon}, партнер — ${top.theyWon}.`;
    if (top.theyWon === 0 && top.weWon >= 3) text += " Партнер не виграв жодного разу — так виглядає прикриття.";
    else if (top.weWon === 0 && top.theyWon >= 3) text += " Ця компанія не виграла жодного разу — можливо, вона прикриває партнера.";
    if (top.label) text += " Партнер уже є в реєстрі АМКУ.";
    out.push({ kind: top.label || (top.theyWon === 0 && top.weWon >= 3) ? "up" : "info", title: `Найчастіший партнер по торгах: ${name}`, text });
  }
  const sanctionedPartners = c.coBidders.filter((p) => p.label).length;
  if (sanctionedPartners > 0) {
    out.push({ kind: "up", title: `${sanctionedPartners} ${plural(sanctionedPartners, "партнер", "партнери", "партнерів")} по торгах уже покарані АМКУ`,
      text: "Графова модель дивиться не лише на компанію, а й на її оточення. Постійні зустрічі з уже покараними компаніями — один із найсильніших сигналів." });
  }
  const infl = [...c.topNeighbors].filter((x) => x.influence !== undefined && (x.influence ?? 0) > 0.01).sort((a, b) => (b.influence ?? 0) - (a.influence ?? 0))[0];
  if (infl) {
    out.push({ kind: "up", title: `Зв'язок із ${infl.name ?? infl.edrpou} піднімає ризик найбільше`,
      text: `Якби ці компанії ніколи не зустрічались на торгах, оцінка була б нижчою приблизно на ${Math.round((infl.influence ?? 0) * 100)} пунктів зі 100.` });
  }
  if (c.degree >= 3 && f.weighted_degree !== undefined && f.weighted_degree / c.degree >= 4) {
    out.push({ kind: dir("weighted_degree", "info"), title: "Мало різних суперників, але зустрічі частi",
      text: `${c.degree} ${plural(c.degree, "суперник", "суперники", "суперників")} за ${Math.round(f.weighted_degree)} зустрічей: у середньому ${times(Math.round(f.weighted_degree / c.degree))} з кожним. Звичайні компанії частіше мають багато випадкових суперників.` });
  }
  if (f.clustering !== undefined && c.degree >= 4 && f.clustering >= 0.35) {
    out.push({ kind: dir("clustering", "up"), title: "Суперники компанії дружать між собою",
      text: `${pctText(f.clustering)} її суперників теж зустрічались один з одним. Замкнене коло з тих самих фірм — так виглядають групи, які ділять ринок.` });
  }
  if (f.n_buyers !== undefined && n >= 10 && f.n_buyers <= 2) {
    out.push({ kind: dir("buyer_hhi", "info"), title: `Працює лише з ${f.n_buyers} ${plural(f.n_buyers, "замовником", "замовниками", "замовниками")}`,
      text: "Уся історія торгів зосереджена в одного-двох замовників. Це може бути спеціалізація, а може бути «свій» замовник." });
  }
  if (out.length === 0) {
    out.push({ kind: "down", title: "Нічого незвичного не знайдено", text: "Частка перемог, кількість учасників у тендерах і коло суперників виглядають як у звичайної компанії." });
  }
  const order = { up: 0, info: 1, down: 2 };
  return out.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 6);
}

export function verdictTender(t: RiskTender): { title: string; text: string } {
  const s = t.signals;
  if (s.biddersCount <= 1) return { title: "Конкуренції не було", text: "У тендері лише один учасник. Про змову між учасниками тут говорити не можна, але варто подивитись, чи цей учасник не є єдиним і в інших торгах цього замовника." };
  if (s.tenderRisk >= 0.7) return { title: "Є вагомі ознаки домовленості між учасниками", text: "Учасники або вже карались АМКУ, або постійно зустрічаються між собою, або мають історію, дуже схожу на покараних. Це підстава перевірити тендер до підписання договору." };
  if (s.tenderRisk >= 0.45) return { title: "Є окремі ознаки, варто придивитись", text: "Частина учасників має підозрілу історію або вони зустрічались раніше. Це не доказ, але привід звірити документи учасників на схожість." };
  return { title: "Ознак змови між учасниками не видно", text: "Учасники мають звичайну історію і не є постійними партнерами по торгах." };
}

export function reasonsTender(t: RiskTender): Reason[] {
  const s = t.signals;
  const names = new Map(t.participants.map((p) => [p.edrpou, p.name ?? p.edrpou]));
  const out: Reason[] = [];
  if (s.biddersCount === 2) {
    out.push({ kind: "info", title: "Рівно два учасники", text: "Мінімум для того, щоб торги відбулися. Якщо ці двоє часто зустрічаються і виграє завжди один, це класична схема «один виграє, другий прикриває»." });
  }
  const known = t.participants.filter((p) => p.label);
  if (known.length) {
    out.push({ kind: "up", title: `${known.length} ${plural(known.length, "учасник", "учасники", "учасників")} уже в реєстрі АМКУ`,
      text: `${known.map((p) => p.name ?? p.edrpou).join(", ")}. Компанії, яких вже карали за змову, часто продовжують ту ж практику.` });
  }
  for (const p of [...t.pairs].filter((x) => x.sharedTenders >= 3).sort((a, b) => b.sharedTenders - a.sharedTenders).slice(0, 3)) {
    let text = `Раніше зустрічались у ${tenders(p.sharedTenders)}. ${names.get(p.a)} вигравав ${times(p.aWon)}, ${names.get(p.b)} — ${times(p.bWon)}.`;
    if ((p.aWon === 0 && p.bWon >= 3) || (p.bWon === 0 && p.aWon >= 3)) text += " Один із них не виграв жодного разу — схоже на прикриття.";
    out.push({ kind: "up", title: `${names.get(p.a)} і ${names.get(p.b)} — постійні партнери`, text });
  }
  const risky = t.participants.filter((p) => (p.score ?? 0) >= 0.7 && !p.label);
  if (risky.length) {
    out.push({ kind: "up", title: `${risky.length} ${plural(risky.length, "учасник має", "учасники мають", "учасників мають")} високий ризик`,
      text: `${risky.map((p) => p.name ?? p.edrpou).join(", ")}: історія торгів дуже схожа на історії покараних компаній.` });
  }
  const bids = t.participants.filter((p) => p.bidAmount).map((p) => p.bidAmount as number);
  if (bids.length >= 2 && t.tender.valueAmount) {
    const min = Math.min(...bids), max = Math.max(...bids);
    const spread = (max - min) / t.tender.valueAmount;
    if (spread < 0.01) out.push({ kind: "info", title: "Ставки майже однакові", text: `Різниця між найбільшою і найменшою ставкою менша за 1 % від очікуваної вартості. Це буває на конкурентних ринках, але й у домовлених торгах ціни часто «підганяють».` });
    if (min / t.tender.valueAmount > 0.98) out.push({ kind: "info", title: "Ніхто не знизив ціну", text: "Усі ставки на рівні очікуваної вартості. Справжня конкуренція зазвичай збиває ціну хоча б на кілька відсотків." });
  }
  if (out.length === 0) out.push({ kind: "down", title: "Нічого незвичного", text: "Учасники не є постійними партнерами, не карались і мають звичайну історію." });
  return out;
}
