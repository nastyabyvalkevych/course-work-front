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
