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
};

export type SearchResponse = {
  query: string;
  total: number;
  results: SearchResultItem[];
  metadata: {
    queryTimeMs: number;
    k1: number;
    b: number;
  };
};

export type StatsResponse = {
  totalTenders: number;
  statusDistribution: Array<{ status: string; count: number }>;
  topTerms: Array<{ term: string; documentFrequency: number }>;
  message?: string;
};
