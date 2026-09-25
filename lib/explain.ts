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
export const points = (n: number) => `${n} ${plural(n, "бал", "бали", "балів")}`;
const times = (n: number) => `${n} ${plural(n, "раз", "рази", "разів")}`;

export function verdictCompany(c: RiskCompany): { title: string; text: string } {
  const s = c.score;
  if (c.label) return { title: "Компанія вже покарана АМКУ", text: "Вона є у реєстрі рішень про змову на торгах. Оцінка нижче показує, чи схожа її історія на історії інших покараних, і з ким вона торгувала." };
  if (c.nTenders < 5) return { title: "Замало історії для впевненої оцінки", text: `Компанія має лише ${tenders(c.nTenders)} зі ставками. Даних про неї мало, тому число ризику тут скоріше орієнтир, ніж висновок.` };
  if (s >= 0.7) return { title: "Історія дуже схожа на історії покараних компаній", text: "Такі ж малюнки поведінки і зв'язків були у компаній, яких АМКУ карав за змову. Це підстава подивитись уважніше, а не доказ порушення." };
  if (s >= 0.45) return { title: "Є окремі ознаки, схожі на змову", text: "Частина показників і зв'язків нагадують покараних, частина — звичайних учасників. Варто перевірити партнерів по торгах, наведених нижче." };
  return { title: "Історія схожа на звичайного учасника ринку", text: "Помітної схожості з покараними компаніями не знайдено. Це не гарантія чесності: АМКУ перевіряє малу частку ринку." };
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
    out.push({ kind: dir("share_cover_bids", "up"), title: `У ${pctText(f.share_cover_bids)} тендерів ставка без знижки`,
      text: "Ціна на рівні очікуваної вартості або вище. Так часто виглядає «прикриття»: ставка, яка й не має виграти, лише створює видимість конкуренції." });
  }
  const pairShared = Math.round((f.top_partner_share ?? 0) * n);
  if (f.share_near_identical_bids !== undefined && pairShared >= 5 && f.share_near_identical_bids >= 0.6) {
    out.push({ kind: dir("share_near_identical_bids", "up"), title: `Ставки з головним партнером майже однакові у ${pctText(f.share_near_identical_bids)} спільних тендерів`,
      text: "Різниця цін менша за 1 % від очікуваної вартості. Незалежні компанії рідко так точно збігаються; однакові ціни часто рахує одна людина." });
  }
  if (f.share_bids_within_60min !== undefined && pairShared >= 3 && f.share_bids_within_60min >= 0.7) {
    out.push({ kind: dir("share_bids_within_60min", "up"), title: `Подає ставку в ту ж годину, що й головний партнер (${pctText(f.share_bids_within_60min)} випадків)`,
      text: "Ставки двох «конкурентів» раз за разом з'являються майже одночасно. Так буває, коли їх подають з одного місця." });
  }
  if (f.share_tenders_with_linked !== undefined && f.share_tenders_with_linked >= 0.05) {
    out.push({ kind: dir("share_tenders_with_linked", "up"), title: `У ${pctText(f.share_tenders_with_linked)} тендерів суперник має спільні з нею контакти`,
      text: "Той самий телефон, пошта, адреса чи контактна особа в картці учасника. Змагатися з «собою» — один із найпрямих сигналів змови." });
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
      text: "Сервіс дивиться не лише на компанію, а й на її оточення. Постійні зустрічі з уже покараними компаніями — один із найсильніших сигналів." });
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
  return out.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 8);
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

/**
 * Checklist of collusion signals: the same list powers the "why" chips in the ranking
 * and the full check on the company card. Thresholds sit near the 90th percentile of
 * ordinary companies (see /api/risk/feature-norms), so a hit means "unusual", not "proved".
 */
export type SignalGroup = "Партнери і пари" | "Ставки і ціни" | "Час подачі" | "Контакти і групи" | "Замовники і ринок";
export type SignalCtx = { nTenders: number; degree: number; sanctionedPartners: number };
export type Signal = {
  id: string;
  group: SignalGroup;
  feature?: string; // model feature for the "typical company" comparison
  short: string; // chip text in the ranking
  title: string;
  text: string;
  threshold: string; // human-readable trigger
  format: "pct" | "num" | "yes" | "min";
  minTenders: number;
  low?: boolean; // the signal fires on unusually LOW values
  value: (f: Record<string, number>, c: SignalCtx) => number | undefined;
  hit: (v: number, f: Record<string, number>, c: SignalCtx) => boolean;
};

const pairShared = (f: Record<string, number>, c: SignalCtx) => Math.round((f.top_partner_share ?? 0) * c.nTenders);
const feat = (k: string) => (f: Record<string, number>) => (Number.isFinite(f[k]) ? f[k] : undefined);

// ordered by how telling the signal is: the ranking shows the first few that fire
export const SIGNALS: Signal[] = [
  { id: "sanctioned", group: "Контакти і групи", short: "партнери вже покарані", format: "num", minTenders: 1,
    title: "Серед постійних партнерів є покарані АМКУ", threshold: "хоча б один",
    text: "Компанія регулярно зустрічається на торгах з фірмами, яких уже карали за змову.",
    value: (_f, c) => c.sanctionedPartners, hit: (v) => v >= 1 },
  { id: "linked", group: "Контакти і групи", feature: "share_tenders_with_linked", short: "суперник зі спільними контактами", format: "pct", minTenders: 1,
    title: "Змагається з компаніями, що мають спільні контакти", threshold: "від 5 % тендерів",
    text: "Частка тендерів, де серед суперників є фірма з тим самим телефоном, поштою, адресою чи контактною особою.",
    value: feat("share_tenders_with_linked"), hit: (v) => v >= 0.05 },
  { id: "near_identical", group: "Ставки і ціни", feature: "share_near_identical_bids", short: "однакові ставки з партнером", format: "pct", minTenders: 10,
    title: "Майже однакові ставки з головним партнером", threshold: "від 60 % спільних тендерів (мін. 5)",
    text: "Частка спільних із головним партнером тендерів, де ставки різняться менше ніж на 1 % очікуваної вартості.",
    value: (f, c) => (pairShared(f, c) >= 5 ? feat("share_near_identical_bids")(f) : undefined), hit: (v) => v >= 0.6 },
  { id: "fast_bids", group: "Час подачі", feature: "share_bids_within_60min", short: "ставки з партнером в ту ж годину", format: "pct", minTenders: 10,
    title: "Ставки з головним партнером подаються майже одночасно", threshold: "від 70 % спільних тендерів",
    text: "Частка спільних тендерів, де між ставкою компанії і ставкою головного партнера минуло не більше години.",
    value: (f, c) => (pairShared(f, c) >= 3 ? feat("share_bids_within_60min")(f) : undefined), hit: (v) => v >= 0.7 },
  { id: "win_imbalance", group: "Партнери і пари", feature: "top_pair_win_imbalance", short: "у парі виграє завжди один", format: "pct", minTenders: 10,
    title: "У парі з головним партнером виграє завжди той самий", threshold: "перекіс від 90 %, партнер у половині тендерів",
    text: "Коли двоє часто зустрічаються, а перемоги дістаються лише одному, другий схожий на «прикриття».",
    value: (f, c) => (pairShared(f, c) >= 5 && (f.top_partner_share ?? 0) >= 0.5 ? feat("top_pair_win_imbalance")(f) : undefined), hit: (v) => v >= 0.9 },
  { id: "tight_group", group: "Контакти і групи", feature: "in_tight_group", short: "тісна група", format: "yes", minTenders: 1,
    title: "Входить у тісну групу компаній", threshold: "так",
    text: "Кілька компаній, які зустрічаються на торгах переважно одна з одною і майже не мають інших суперників.",
    value: feat("in_tight_group"), hit: (v) => v >= 1 },
  { id: "exclusive_pair", group: "Партнери і пари", feature: "top_partner_exclusivity", short: "замкнена пара", format: "pct", minTenders: 10,
    title: "Головна пара майже не торгується з іншими", threshold: "від 20 %",
    text: "Яку частку всіх тендерів обох компаній разом складають їхні спільні тендери. Чим вище, тим більше пара схожа на одну команду, а не на конкурентів.",
    value: (f, c) => (pairShared(f, c) >= 5 ? feat("top_partner_exclusivity")(f) : undefined), hit: (v) => v >= 0.2 },
  { id: "two_bidders", group: "Партнери і пари", feature: "share_two_bidders", short: "часто торги удвох", format: "pct", minTenders: 10,
    title: "Часто торги рівно удвох", threshold: "від 50 % тендерів",
    text: "Двоє — мінімум, щоб торги відбулися. Типова схема: один виграє, другий формально програє.",
    value: feat("share_two_bidders"), hit: (v) => v >= 0.5 },
  { id: "cover_bids", group: "Ставки і ціни", feature: "share_cover_bids", short: "ставки без знижки", format: "pct", minTenders: 10,
    title: "Ставки без знижки від очікуваної вартості", threshold: "від 40 % тендерів",
    text: "Частка ставок на рівні 99 % очікуваної вартості або вище. Така ставка майже не має шансів і часто лише «заповнює» торги.",
    value: feat("share_cover_bids"), hit: (v) => v >= 0.4 },
  { id: "small_gap", group: "Ставки і ціни", feature: "mean_gap12", short: "друга ставка впритул", format: "pct", minTenders: 10, low: true,
    title: "Друга найнижча ставка ледь вища за першу", threshold: "у середньому до 2,8 %",
    text: "Середній розрив між двома найдешевшими пропозиціями в тендерах компанії. Коли він постійно мізерний, ціни схожі на погоджені заздалегідь.",
    value: feat("mean_gap12"), hit: (v) => v <= 0.028 },
  { id: "similar_bids", group: "Ставки і ціни", feature: "mean_cv_bids", short: "ставки всіх учасників схожі", format: "pct", minTenders: 10, low: true,
    title: "Ставки всіх учасників дуже схожі між собою", threshold: "розкид у середньому до 5 %",
    text: "Наскільки різняться ціни учасників у тендерах компанії. У справжній конкуренції розкид зазвичай більший (типово 12 %).",
    value: feat("mean_cv_bids"), hit: (v) => v <= 0.05 },
  { id: "round_bids", group: "Ставки і ціни", feature: "share_round_bids", short: "круглі ставки", format: "pct", minTenders: 10,
    title: "Ставки круглими сумами", threshold: "від 60 % ставок",
    text: "Ціни, кратні 1000 грн. Справжній кошторис рідко дає круглу суму; кругла ставка буває в того, хто не збирається виграти.",
    value: feat("share_round_bids"), hit: (v) => v >= 0.6 },
  { id: "lost_cheapest", group: "Ставки і ціни", feature: "share_lost_as_cheapest", short: "програє найдешевшою", format: "pct", minTenders: 10,
    title: "Програє, запропонувавши найнижчу ціну", threshold: "від 30 % ставок",
    text: "Найдешевшу пропозицію відхиляють або учасник сам відмовляється, і договір дістається дорожчому — інколи так «передають» перемогу.",
    value: feat("share_lost_as_cheapest"), hit: (v) => v >= 0.3 },
  { id: "won_not_cheapest", group: "Ставки і ціни", feature: "share_won_not_cheapest", short: "виграє не найдешевшою", format: "pct", minTenders: 10,
    title: "Виграє, не будучи найдешевшою", threshold: "від 25 % ставок",
    text: "Перемога з ціною вищою за найнижчу ставку. Дзеркальна ознака до попередньої.",
    value: feat("share_won_not_cheapest"), hit: (v) => v >= 0.25 },
  { id: "top_partner", group: "Партнери і пари", feature: "top_partner_share", short: "постійний партнер", format: "pct", minTenders: 10,
    title: "Майже завжди на торгах з тим самим партнером", threshold: "від 80 % тендерів",
    text: "Частка тендерів компанії, де був її найчастіший суперник.",
    value: (f, c) => (pairShared(f, c) >= 5 ? feat("top_partner_share")(f) : undefined), hit: (v) => v >= 0.8 },
  { id: "closed_circle", group: "Партнери і пари", feature: "clustering", short: "замкнене коло", format: "pct", minTenders: 10,
    title: "Суперники зустрічаються й між собою", threshold: "від 60 %, мін. 4 суперники",
    text: "Частка пар серед суперників компанії, які теж торгувались одне з одним. Замкнене коло — так виглядають групи, що ділять ринок.",
    value: (f, c) => (c.degree >= 4 ? feat("clustering")(f) : undefined), hit: (v) => v >= 0.6 },
  { id: "two_bidder_excess", group: "Замовники і ринок", feature: "two_bidder_excess", short: "удвох частіше за ринок", format: "pct", minTenders: 10,
    title: "Торги удвох частіше, ніж зазвичай на її ринку", threshold: "на 25 пунктів вище ринку",
    text: "На скільки частка торгів удвох у компанії перевищує середню для її головного ринку (код ДК 021).",
    value: feat("two_bidder_excess"), hit: (v) => v >= 0.25 },
  { id: "win_rate", group: "Замовники і ринок", feature: "win_rate", short: "виграє більшість", format: "pct", minTenders: 10,
    title: "Виграє більшість своїх тендерів", threshold: "від 70 %",
    text: "Так виграють або справжні лідери ринку, або ті, кому суперники підіграють. Сама по собі ознака слабка.",
    value: feat("win_rate"), hit: (v) => v >= 0.7 },
  { id: "own_buyers", group: "Замовники і ринок", feature: "n_own_buyers", short: "«свої» замовники", format: "num", minTenders: 10,
    title: "Є «свої» замовники", threshold: "від 3 замовників",
    text: "Замовники, у яких компанія брала участь щонайменше 3 рази і виграла більше половини.",
    value: feat("n_own_buyers"), hit: (v) => v >= 3 },
  { id: "two_bidder_buyers", group: "Замовники і ринок", feature: "share_two_bidder_buyers", short: "замовники з торгами удвох", format: "pct", minTenders: 10,
    title: "Працює в замовників, де торги часто удвох", threshold: "від 25 % тендерів",
    text: "Частка тендерів компанії в замовників, у яких торги з двома учасниками трапляються значно частіше, ніж зазвичай.",
    value: feat("share_two_bidder_buyers"), hit: (v) => v >= 0.25 },
  { id: "single_bidder", group: "Замовники і ринок", feature: "single_bidder_share", short: "часто єдиний учасник", format: "pct", minTenders: 10,
    title: "Часто єдиний учасник торгів", threshold: "від 30 % тендерів",
    text: "Торги без конкурентів. Це не змова між учасниками, але може означати домовленість із замовником або вузький ринок.",
    value: feat("single_bidder_share"), hit: (v) => v >= 0.3 },
  { id: "local", group: "Замовники і ринок", feature: "share_home_region_tenders", short: "лише своя область", format: "pct", minTenders: 10,
    title: "Торгує лише у своїй області і зі «своїми»", threshold: "від 90 % тендерів і 80 % партнерів",
    text: "Майже всі тендери — у замовників своєї області, і майже всі суперники звідти ж. Замкнений місцевий ринок легше поділити.",
    value: feat("share_home_region_tenders"), hit: (v, f) => v >= 0.9 && (f.share_same_region_partners ?? 0) >= 0.8 },
  { id: "own_buyer", group: "Замовники і ринок", feature: "top_buyer_share", short: "один замовник", format: "pct", minTenders: 10,
    title: "Більшість торгів в одного замовника", threshold: "від 60 % тендерів",
    text: "Може бути спеціалізацією, а може бути «своїм» замовником.",
    value: feat("top_buyer_share"), hit: (v) => v >= 0.6 },
];

export type SignalResult = { signal: Signal; value: number | undefined; hit: boolean; enoughData: boolean };

export function evaluateSignals(f: Record<string, number> | undefined, c: SignalCtx): SignalResult[] {
  const feats = f ?? {};
  return SIGNALS.map((signal) => {
    const enoughData = c.nTenders >= signal.minTenders;
    const value = signal.value(feats, c);
    return { signal, value, enoughData, hit: enoughData && value !== undefined && signal.hit(value, feats, c) };
  });
}

export const formatSignalValue = (s: Signal, v: number | undefined) => {
  if (v === undefined || !Number.isFinite(v)) return "—";
  if (s.format === "yes") return v >= 1 ? "так" : "ні";
  if (s.format === "num") return String(Math.round(v));
  if (s.format === "min") return `${Math.round(v)} хв`;
  if (s.id === "two_bidder_excess") return `${v >= 0 ? "+" : ""}${Math.round(v * 100)} п.`;
  return pctText(v);
};
