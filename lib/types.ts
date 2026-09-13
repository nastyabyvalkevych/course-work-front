export type Tender = {
  id: number;
  prozorroId: string;
  title?: string | null;
  description?: string | null;
  procuringEntity?: string | null;
  cpvCodes: string[];
  valueAmount?: number | null;
  valueCurrency?: string | null;
  status?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  rawData?: unknown;
};

export type SearchResultItem = {
  tender: Tender;
  score: number;
  highlights: string[];
  matchedFields: string[];
  matchedTerms?: Array<{ field: string; terms: string[] }>;
};

export type SearchResponse = {
  query: string;
  total: number;
  results: SearchResultItem[];
  metadata: {
    queryTimeMs: number;
    k1: number;
    b: number;
    profile?: string;
    queryTerms: string[];
  };
};

export type StatsResponse = {
  totalTenders: number;
  statusDistribution: Array<{ status: string; count: number }>;
  topTerms: Array<{ term: string; documentFrequency: number }>;
  message?: string;
};

// OSINT Types
export type CoParticipationPair = {
  edrpouA: string;
  edrpouB: string;
  nameA: string;
  nameB: string;
  count: number;
  tenderIds: string[];
};

export type WinRateAnomaly = {
  edrpou: string;
  name: string;
  bids: number;
  wins: number;
  rate: number;
};

export type RegionalDominanceEntry = {
  region: string;
  dominantEdrpou: string;
  dominantName: string;
  wins: number;
  total: number;
  pct: number;
};

export type HhiEntry = {
  cpvDivision: string;
  totalAwards: number;
  uniqueSuppliers: number;
  hhi: number;
  level: "highly concentrated" | "moderately concentrated" | "unconcentrated";
  topSupplierEdrpou: string;
  topSupplierSharePct: number;
};

export type BidRotationCohort = {
  cohortEdrs: string[];
  cohortSize: number;
  numTenders: number;
  winnersCount: number;
  uniformity: number;
};

export type TopSingleBidderEntity = {
  edrpou: string;
  name: string;
  count: number;
};

export type OsintReport = {
  id: number;
  generatedAt: string;
  numTenders: number;
  metadata: {
    thresholds: Record<string, number>;
    generatedAt: string;
    durationMs: number;
  };
  singleBidderCount: number;
  singleBidderRatio: number;
  multiBidderCount: number;
  topSingleBidderEntities: TopSingleBidderEntity[];
  coParticipationPairs: CoParticipationPair[];
  winRateAnomalies: WinRateAnomaly[];
  regionalDominance: RegionalDominanceEntry[];
  hhiPerCpv: HhiEntry[];
  bidRotationCohorts: BidRotationCohort[];
};

export type OsintSignal = {
  id: string;
  label: string;
  description: string;
  tone: "danger" | "warning" | "info";
};

// ---------------------------------------------------------------- risk ----

export type RiskContribution = {
  feature: string;
  label: string;
  value: number;
  contribution: number;
};

export type RiskNeighbor = {
  edrpou: string;
  name: string | null;
  weight: number;
  score: number;
  label: boolean;
  influence?: number; // change of this company's score if the edge to the neighbour is removed
};

export type RiskRankingItem = {
  edrpou: string;
  name: string | null;
  score: number;
  rank: number;
  percentile: number;
  label: boolean;
  firstDecision: string | null;
  group: string;
  coverage: string;
  nTenders: number;
  nWon: number;
  winRate: number;
  degree: number;
};

export type RiskRegion = {
  region: string;
  companies: number;
  sanctioned: number;
  sanctionedShare: number;
  highRisk: number;
  highRiskShare: number;
  meanScore: number;
  medianScore: number;
  tendersAsBidder: number;
};

export type RiskRegions = {
  minTenders: number;
  totalCompanies: number;
  regions: RiskRegion[];
};

export type RiskRanking = {
  total: number;
  limit: number;
  offset: number;
  items: RiskRankingItem[];
};

export type RiskSummary = {
  modelVersion: string;
  computedAt: string;
  companiesScored: number;
  companiesInRegister: number;
  tendersInDatabase: number;
  coverage: Array<{ group: string; coverage: string; count: number }>;
  register: Array<{ version: string; rows: number; latestDecision: string | null }>;
};

export type RiskDecision = {
  decisionNumber: string;
  decisionDate: string;
  body: string | null;
  courtCaseNumber: string | null;
  courtContent: string | null;
};

export type RiskCoBidder = {
  edrpou: string;
  name: string | null;
  sharedTenders: number;
  theyWon: number;
  weWon: number;
  score: number | null;
  label: boolean | null;
  rank: number | null;
};

export type RiskRecentTender = {
  id: number;
  tenderID: string | null;
  title: string | null;
  procuringEntity: string | null;
  datePublished: string | null;
  valueAmount: number | null;
  bidders: number;
  won: boolean;
};

export type RiskCompany = RiskRankingItem & {
  features: Record<string, number>;
  contributions: RiskContribution[];
  topNeighbors: RiskNeighbor[];
  modelVersion: string;
  computedAt: string;
  decisions: RiskDecision[];
  coBidders: RiskCoBidder[];
  recentTenders: RiskRecentTender[];
};

export type RiskGraphNode = {
  edrpou: string;
  name: string | null;
  score: number | null;
  label: boolean | null;
  nTenders: number;
  center: boolean;
};

export type RiskGraph = {
  nodes: RiskGraphNode[];
  edges: Array<{ source: string; target: string; weight: number }>;
};

export type RiskTender = {
  tender: {
    id: number;
    prozorroId: string;
    tenderID: string | null;
    title: string | null;
    procuringEntity: string | null;
    buyerEdrpou?: string | null;
    valueAmount: number | null;
    valueCurrency: string | null;
    status: string | null;
    datePublished: string | null;
    procurementMethodType: string | null;
  };
  participants: Array<{
    edrpou: string;
    name: string | null;
    bidAmount: number | null;
    isWinner: boolean;
    score: number | null;
    rank: number | null;
    label: boolean;
    nTenders: number | null;
    winRate: number | null;
  }>;
  pairs: Array<{ a: string; b: string; sharedTenders: number; aWon: number; bWon: number }>;
  signals: {
    biddersCount: number;
    maxParticipantScore: number;
    knownParticipants: number;
    repeatedPairs: number;
    tenderRisk: number;
  };
};

// --- Markov reliability self-assessment ---
export type ReliabilityModuleSpec = {
  id: string;
  name: string;
  reliability: number;
  meanSojournMs: number;
  failureRatePerHour?: number;
  evidence?: string;
};

export type ReliabilityTaskSpec = {
  id: string;
  name: string;
  weight: number;
  path: string[];
  observedSuccessRate?: number;
};

export type ReliabilityProfile = {
  system: string;
  version?: string;
  modules: ReliabilityModuleSpec[];
  tasks: ReliabilityTaskSpec[];
  requestsPerHour?: number;
  meanRepairMinutes?: number;
};

export type ReliabilityReport = {
  system: string;
  version?: string;
  computedAt: string;
  horizonHours: number;
  usage: {
    moduleIds: string[];
    initial: number[];
    transition: number[][];
    exit: number[];
    taskModule: number[][];
    moduleUsage: number[];
  };
  discrete: {
    systemReliability: number;
    expectedPathLength: number;
    meanResponseMs: number;
    operationalFailuresPerHour?: number;
  };
  continuous: {
    utilisation: number;
    failureRatePerHour: number;
    mttfHours: number;
    reliabilityAtHorizon: number;
    curve: { hours: number; reliability: number }[];
    availability?: number;
  };
  modules: {
    id: string;
    name: string;
    reliability: number;
    meanSojournMs: number;
    failureRatePerHour: number;
    expectedVisits: number;
    timeShare: number;
    sensitivity: number;
    improvementPotential: number;
  }[];
  tasks: {
    id: string;
    name: string;
    weight: number;
    modelReliability: number;
    observedSuccessRate?: number;
    absError?: number;
  }[];
  live?: { database: "ok" | "down"; cache: "ok" | "unavailable" };
};

// --- retrospective backtest ---
export type BacktestCurvePoint = { k: number; precision: number; recall: number; lift: number };

export type BacktestMetrics = {
  population: number;
  totalCaught: number;
  baseRate: number;
  curve: BacktestCurvePoint[];
  recallTop10Pct: number;
};

export type BacktestCompany = {
  edrpou: string;
  name: string | null;
  score: number;
  rank: number;
  rankFull: number | null;
  rankUsed: number;
  group: string;
  coverage: string;
  nTenders: number;
  degree: number;
  firstDecision: string | null;
  outcome: "known" | "caught" | "none";
  percentile?: number | null;
};

export type BacktestList = {
  items: (BacktestMetrics & { cutoffYear: number; cutoffDate: string | null; modelVersion: string; companies: number })[];
};

export type Backtest = BacktestMetrics & {
  cutoffYear: number;
  cutoffDate: string | null;
  modelVersion: string;
  computedAt: string;
  fullCoverageOnly: boolean;
  top: BacktestCompany[];
  caughtLater: BacktestCompany[];
};

// --- markets, money, links, groups (company card) ---
export type Market = {
  cpv: string;
  tenders: number;
  suppliers: number;
  singleBidderShare: number;
  twoBidderShare: number;
  wonTotal: number;
  wonHighRisk: number;
  wonSanctioned: number;
  highRiskShareMoney: number;
  highRiskSuppliers: number;
  sanctionedSuppliers: number;
  highRiskSupplierShare: number;
};
export type MarketsResponse = { minTenders: number; items: Market[] };

export type MoneyItem = {
  key: string | null;
  wonTotal: number;
  wonHighRisk: number;
  wonSanctioned: number;
  awards: number;
  awardsHighRisk: number;
  highRiskShare: number;
};
export type MoneyResponse = { by: "year" | "region"; items: MoneyItem[] };

export type CompanyLinkItem = {
  edrpou: string;
  name: string | null;
  score: number | null;
  label: boolean;
  nTenders: number | null;
  kinds: string[];
  sharedTenders: number;
};

export type CompanyGroupSummary = {
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
  members: { edrpou: string; name: string | null; score: number | null; label: boolean }[];
};

export type WatchItem = {
  type: "company" | "buyer";
  id: string;
  name: string | null;
  addedAt: string;
  lastSeen?: string;
};
