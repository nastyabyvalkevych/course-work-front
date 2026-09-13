// Types for the insights endpoints (buyers, groups, links, markets, money).

export type BuyerListItem = {
  edrpou: string;
  name: string | null;
  region: string | null;
  tenders: number;
  singleBidderShare: number;
  twoBidderShare: number;
  highRiskWins: number;
  sanctionedWins: number;
  wonTotal: number;
  wonHighRisk: number;
};

export type BuyerList = { minTenders: number; items: BuyerListItem[] };

export type BuyerSupplier = {
  edrpou: string;
  name: string | null;
  bids: number;
  wins: number;
  wonAmount: number;
  score: number | null;
  label: boolean;
};

export type BuyerPair = {
  a: string;
  b: string;
  nameA: string | null;
  nameB: string | null;
  shared: number;
  aWon: number;
  bWon: number;
  scoreA: number | null;
  scoreB: number | null;
  labelA: boolean;
  labelB: boolean;
};

export type BuyerRecentTender = {
  id: number;
  tenderID: string | null;
  title: string | null;
  datePublished: string | null;
  valueAmount: number | null;
  bidders: number;
  winner: string | null;
  winnerScore: number | null;
};

export type Buyer = {
  edrpou: string;
  name: string | null;
  region: string | null;
  tenders: number;
  tendersWithBids: number;
  singleBidderShare: number;
  twoBidderShare: number;
  valueTotal: number;
  firstTender: string | null;
  lastTender: string | null;
  suppliers: BuyerSupplier[];
  repeatedPairs: BuyerPair[];
  recentTenders: BuyerRecentTender[];
  signals: {
    highRiskSuppliers: number;
    sanctionedSuppliers: number;
    repeatedPairs: number;
    wonTotalTop: number;
    wonHighRiskTop: number;
  };
};

export type GroupMember = {
  edrpou: string;
  name: string | null;
  score: number | null;
  label: boolean;
  nTenders: number;
  nWon: number;
  wonAmount: number;
};

export type TightGroup = {
  id: number;
  size: number;
  sharedTenders: number;
  totalTenders: number;
  wonAmount: number;
  sanctioned: number;
  sameDecision: number;
  meanScore: number;
  maxScore: number;
  regions: string[];
  topCpv: string[];
  firstShared: string | null;
  lastShared: string | null;
  computedAt: string;
  members: GroupMember[];
};

export type GroupList = {
  total: number;
  limit: number;
  offset: number;
  summary: { groups: number; companies: number; wonAmount: number; sanctioned: number };
  items: TightGroup[];
};

export type GroupPair = { a: string; b: string; shared: number; aWon: number; bWon: number };
export type GroupBuyer = { edrpou: string | null; name: string | null; tenders: number; amount: number };
export type CompanyLink = { id: number; edrpouA: string; edrpouB: string; kinds: string[] };
export type GroupRecentTender = {
  id: number;
  tender_id: string | null;
  title: string | null;
  buyer: string | null;
  date: string | null;
  value: number | null;
  members: number;
  winner: string | null;
};

export type GroupDetail = TightGroup & {
  pairs: GroupPair[];
  buyers: GroupBuyer[];
  links: CompanyLink[];
  recentTenders: GroupRecentTender[];
};

export type LinkedCompany = {
  edrpou: string;
  name: string | null;
  score: number | null;
  label: boolean;
  nTenders: number | null;
  kinds: string[];
  sharedTenders: number;
};

export const LINK_KIND_LABEL: Record<string, string> = {
  phone: "телефон",
  email: "пошта",
  person: "контактна особа",
  address: "адреса",
};

export const REGION_LIST = [
  "Вінницька область", "Волинська область", "Дніпропетровська область", "Донецька область", "Житомирська область",
  "Закарпатська область", "Запорізька область", "Івано-Франківська область", "Київська область", "м. Київ",
  "Кіровоградська область", "Луганська область", "Львівська область", "Миколаївська область", "Одеська область",
  "Полтавська область", "Рівненська область", "Сумська область", "Тернопільська область", "Харківська область",
  "Херсонська область", "Хмельницька область", "Черкаська область", "Чернівецька область", "Чернігівська область",
];
