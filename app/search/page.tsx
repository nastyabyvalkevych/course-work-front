"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { fetchJson } from "@/lib/api";
import { getOsintBadges, osintBadgeClass } from "@/lib/osint";
import { formatStatus, statusBadgeClass } from "@/lib/status";
import { SearchResponse, SearchResultItem } from "@/lib/types";

const DEFAULT_LIMIT = 20;
const DEFAULT_SEARCH_PROFILE = "bm25f_default";
const STORAGE_KEY = "prozorro-insight-search-state";

const statusOptions = ["", "active", "complete", "cancelled", "unsuccessful"];

const quickQueries = [
  "медикаменти київ",
  "ремонт доріг львів",
  "послуги охорони",
  "обслуговування транспорту",
];

const profileOptions = [
  {
    value: "",
    label: "Однопольовий BM25",
    description: "Швидкий baseline без багатопольового підсилення.",
  },
  {
    value: "bm25f_default",
    label: "BM25F",
    description: "Базове ранжування по 36 полях тендера з лематизацією.",
  },
  {
    value: "da_bm25f_combined",
    label: "BM25F + Exact Boost",
    description: "Підсилює точні збіги в ключових полях для специфічних запитів.",
  },
];

const fieldLabelMap: Record<string, string> = {
  title: "Назва",
  description: "Опис",
  cpv: "CPV",
  cpvText: "Предмет закупівлі",
  itemsText: "Опис позицій",
  itemsQuantityText: "Кількість позицій",
  itemsUnit: "Одиниці виміру",
  status: "Статус",
  valueCurrency: "Валюта",
  procuringEntityName: "Замовник",
  procuringEntityId: "ЄДРПОУ замовника",
  procuringEntityRegion: "Регіон замовника",
  procuringEntityLocality: "Населений пункт замовника",
  procuringEntityGeoText: "Географія замовника",
  participantsNames: "Учасник",
  participantsIds: "ЄДРПОУ учасника",
  participantsRegions: "Регіон учасника",
  participantsLocalities: "Населений пункт учасника",
  winnerNames: "Переможець",
  winnerIds: "ЄДРПОУ переможця",
  winnerAwardStatus: "Статус переможця",
  winnerValueCurrency: "Валюта переможця",
  bidValuesText: "Суми пропозицій",
  bidUnitPricesText: "Ціна за одиницю",
  deliveryRegion: "Регіон поставки",
  deliveryLocality: "Населений пункт поставки",
  deliveryGeoText: "Географія поставки",
  docsText: "Документи",
  milestonesText: "Етапи",
  paymentTermsText: "Умови оплати",
  procurementMethodType: "Тип процедури",
  awardCriteria: "Критерії оцінки",
  awardPeriodText: "Період оцінки",
  contractStatus: "Статус договору",
  technicalRequirementsText: "Технічні вимоги",
  technicalResponsesText: "Технічні відповіді",
  procurementMethod: "Процедура",
  mainProcurementCategory: "Категорія закупівлі",
};

const formatCurrency = (value?: number | null, currency?: string | null) => {
  if (value === null || value === undefined) {
    return "—";
  }
  const currencyCode = currency || "UAH";
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
  }).format(date);
};

const excerptText = (value?: string | null, maxLength = 260) => {
  if (!value) {
    return "Опис відсутній.";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}…`;
};

type SearchTab = "exact" | "partial";

type SearchFormState = {
  q: string;
  status: string;
  minValue: string;
  maxValue: string;
  dateFrom: string;
  dateTo: string;
  sort: string;
  useMultifield: boolean;
  profile: string;
};

type PersistedSearchState = {
  activeTab: SearchTab;
  formState: SearchFormState;
  page: number;
  submittedState: SearchFormState | null;
};

const initialFormState: SearchFormState = {
  q: "",
  status: "",
  minValue: "",
  maxValue: "",
  dateFrom: "",
  dateTo: "",
  sort: "score",
  useMultifield: true,
  profile: DEFAULT_SEARCH_PROFILE,
};

const getProfileMeta = (profile: string) =>
  profileOptions.find((option) => option.value === profile) ?? profileOptions[1];

const normalizePage = (value: number) =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;

const normalizeFormState = (state: SearchFormState): SearchFormState => ({
  ...state,
  q: state.q.trim(),
  minValue: state.minValue.trim(),
  maxValue: state.maxValue.trim(),
  profile: state.profile,
  useMultifield: state.profile !== "",
});

const buildFormStateFromParams = (params: URLSearchParams): SearchFormState => {
  const profile = params.has("profile")
    ? params.get("profile") ?? ""
    : params.get("useMultifield") === "false"
      ? ""
      : DEFAULT_SEARCH_PROFILE;

  return {
    q: params.get("q") ?? "",
    status: params.get("status") ?? "",
    minValue: params.get("minValue") ?? "",
    maxValue: params.get("maxValue") ?? "",
    dateFrom: params.get("dateFrom") ?? "",
    dateTo: params.get("dateTo") ?? "",
    sort: params.get("sort") ?? "score",
    useMultifield: params.has("useMultifield")
      ? params.get("useMultifield") === "true"
      : profile !== "",
    profile,
  };
};

const hasIncomingSearchState = (params: URLSearchParams) =>
  [
    "q",
    "status",
    "minValue",
    "maxValue",
    "dateFrom",
    "dateTo",
    "sort",
    "profile",
    "useMultifield",
    "page",
  ].some((key) => params.has(key));

const buildRequestBody = (state: SearchFormState, page: number) => {
  const normalized = normalizeFormState(state);
  const body: Record<string, unknown> = {
    q: normalized.q,
    limit: DEFAULT_LIMIT,
    offset: Math.max(0, (page - 1) * DEFAULT_LIMIT),
    useMultifield: normalized.useMultifield,
  };

  if (normalized.status) {
    body.status = normalized.status;
  }
  if (normalized.minValue) {
    body.minValue = Number(normalized.minValue);
  }
  if (normalized.maxValue) {
    body.maxValue = Number(normalized.maxValue);
  }
  if (normalized.dateFrom) {
    body.dateFrom = normalized.dateFrom;
  }
  if (normalized.dateTo) {
    body.dateTo = normalized.dateTo;
  }
  if (normalized.sort) {
    body.sort = normalized.sort;
  }
  if (normalized.profile) {
    body.profile = normalized.profile;
  }

  return body;
};

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<SearchTab>("partial");
  const [formState, setFormState] = useState<SearchFormState>(initialFormState);
  const [submittedState, setSubmittedState] =
    useState<SearchFormState | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (hasIncomingSearchState(params)) {
      const nextFormState = buildFormStateFromParams(params);
      const nextPage = normalizePage(Number(params.get("page") ?? "1"));

      setFormState(nextFormState);
      setSubmittedState(nextFormState.q ? normalizeFormState(nextFormState) : null);
      setPage(nextPage);
      window.history.replaceState(window.history.state, "", "/search");
      hasHydratedRef.current = true;
      return;
    }

    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PersistedSearchState;
        if (parsed.formState) {
          setFormState(parsed.formState);
        }
        if (parsed.submittedState) {
          setSubmittedState(parsed.submittedState);
        }
        setPage(normalizePage(parsed.page ?? 1));
        setActiveTab(parsed.activeTab ?? "partial");
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === "undefined") {
      return;
    }

    const snapshot: PersistedSearchState = {
      activeTab,
      formState,
      page,
      submittedState,
    };

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [activeTab, formState, page, submittedState]);

  useEffect(() => {
    if (!submittedState?.q.trim()) {
      setData(null);
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const payload = buildRequestBody(submittedState, page);

    setIsLoading(true);
    setError(null);
    setData(null);
    setResults([]);

    fetchJson<SearchResponse>("/api/search", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((response) => {
        setData(response);
        setResults(response.results);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, submittedState]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / DEFAULT_LIMIT))
    : 1;

  const profileMeta = getProfileMeta(submittedState?.profile ?? formState.profile);

  const lemmatizedQueryTerms = useMemo(() => {
    if (!data?.metadata?.queryTerms?.length) {
      return [];
    }

    return data.metadata.queryTerms.map((term) => term.toLowerCase());
  }, [data]);

  const hasQueryTerms = lemmatizedQueryTerms.length > 0;

  const exactResults = useMemo(() => {
    if (!data || !hasQueryTerms) {
      return [];
    }

    return results.filter((item) => {
      const matchedTerms = item.matchedTerms ?? [];
      if (matchedTerms.length === 0) {
        return false;
      }

      const allMatchedTerms = new Set(
        matchedTerms.flatMap((match) =>
          match.terms.map((term) => term.toLowerCase()),
        ),
      );

      return lemmatizedQueryTerms.every((term) => allMatchedTerms.has(term));
    });
  }, [data, hasQueryTerms, lemmatizedQueryTerms, results]);

  const partialResults = useMemo(() => {
    if (!data) {
      return [];
    }

    if (!hasQueryTerms) {
      return results;
    }

    const exactIds = new Set(exactResults.map((item) => item.tender.id));
    return results.filter((item) => !exactIds.has(item.tender.id));
  }, [data, exactResults, hasQueryTerms, results]);

  // Auto-switch tab based on results
  useEffect(() => {
    if (exactResults.length > 0) {
      setActiveTab("exact");
    } else if (partialResults.length > 0) {
      setActiveTab("partial");
    }
  }, [exactResults.length, partialResults.length]);

  const filteredResults = activeTab === "exact" ? exactResults : partialResults;

  const activeFilters = useMemo(() => {
    if (!submittedState) {
      return [];
    }

    const filters: string[] = [];

    if (submittedState.status) {
      filters.push(`Статус: ${formatStatus(submittedState.status)}`);
    }
    if (submittedState.minValue) {
      filters.push(`Від ${formatCurrency(Number(submittedState.minValue))}`);
    }
    if (submittedState.maxValue) {
      filters.push(`До ${formatCurrency(Number(submittedState.maxValue))}`);
    }
    if (submittedState.dateFrom) {
      filters.push(`Від ${formatDate(submittedState.dateFrom)}`);
    }
    if (submittedState.dateTo) {
      filters.push(`До ${formatDate(submittedState.dateTo)}`);
    }
    if (submittedState.sort === "date") {
      filters.push("Сортування: новіші спочатку");
    }

    return filters;
  }, [submittedState]);

  const submitSearch = (nextState: SearchFormState) => {
    const normalized = normalizeFormState(nextState);
    setFormState(normalized);
    setSubmittedState(normalized.q ? normalized : null);
    setPage(1);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch(formState);
  };

  const handleExport = () => {
    if (!data || results.length === 0) {
      return;
    }

    const rows = results.map((item) => {
      const tender = item.tender;
      return [
        tender.prozorroId,
        tender.title ?? "",
        tender.status ?? "",
        tender.procuringEntity ?? "",
        tender.valueAmount ?? "",
        tender.valueCurrency ?? "",
        tender.datePublished ?? "",
      ];
    });

    const header = [
      "prozorroId",
      "title",
      "status",
      "procuringEntity",
      "valueAmount",
      "valueCurrency",
      "datePublished",
    ];

    const csv = [header, ...rows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tenders.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setActiveTab("partial");
    setFormState(initialFormState);
    setSubmittedState(null);
    setPage(1);
    setData(null);
    setResults([]);
    setError(null);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.history.replaceState(window.history.state, "", "/search");
    }
  };

  const handleQuickQuery = (query: string) => {
    const nextState = { ...formState, q: query };
    setActiveTab("partial");
    submitSearch(nextState);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-surface px-5 py-6 sm:px-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                value={formState.q}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    q: event.target.value,
                  }))
                }
                placeholder="Пошук: назва, ЄДРПОУ, CPV-код, регіон..."
                className="h-12 w-full rounded-xl bg-canvas pl-4 pr-4 text-base font-medium text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 rounded-xl border border-line bg-canvas px-4 text-sm font-semibold text-ink hover:bg-surface-strong transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="16" y2="16" />
                </svg>
                <span className="hidden sm:inline">Фільтри</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-12 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-surface-strong transition"
              >
                Очистити
              </button>
              <button
                type="submit"
                className="h-12 rounded-xl bg-ink px-6 text-sm font-bold tracking-wide text-canvas hover:bg-accent transition"
              >
                Шукати
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Швидкий пошук:</span>
            {quickQueries.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => handleQuickQuery(query)}
                className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:bg-surface-strong transition"
              >
                {query}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 pt-2 border-t border-line/50">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Статус</label>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value }))}
                  className="h-10 rounded-lg bg-canvas px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status ? formatStatus(status) : "Всі"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Сума від</label>
                <input
                  value={formState.minValue}
                  onChange={(e) => setFormState((p) => ({ ...p, minValue: e.target.value }))}
                  type="number"
                  min={0}
                  placeholder="0"
                  className="h-10 rounded-lg bg-canvas px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Сума до</label>
                <input
                  value={formState.maxValue}
                  onChange={(e) => setFormState((p) => ({ ...p, maxValue: e.target.value }))}
                  type="number"
                  min={0}
                  placeholder="10 000 000"
                  className="h-10 rounded-lg bg-canvas px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Дата від</label>
                <input
                  value={formState.dateFrom}
                  onChange={(e) => setFormState((p) => ({ ...p, dateFrom: e.target.value }))}
                  type="date"
                  className="h-10 rounded-lg bg-canvas px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Дата до</label>
                <input
                  value={formState.dateTo}
                  onChange={(e) => setFormState((p) => ({ ...p, dateTo: e.target.value }))}
                  type="date"
                  className="h-10 rounded-lg bg-canvas px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Сортування</label>
                <select
                  value={formState.sort}
                  onChange={(e) => setFormState((p) => ({ ...p, sort: e.target.value }))}
                  className="h-10 rounded-lg bg-canvas px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="score">Релевантність</option>
                  <option value="date">Дата</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Профіль</label>
                <select
                  value={formState.profile}
                  onChange={(e) => setFormState((p) => ({ ...p, profile: e.target.value, useMultifield: e.target.value !== "" }))}
                  className="h-10 rounded-lg bg-canvas px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {profileOptions.map((opt) => (
                    <option key={opt.value || "single"} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div>
          {!submittedState?.q ? (
            <div className="rounded-[2rem] bg-surface p-10 flex flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-ink">
                Очікування запиту
              </h2>
              <p className="mt-4 max-w-lg text-lg text-muted">
                Введіть пошуковий запит зверху, щоб розпочати роботу.
              </p>
            </div>
          ) : isLoading ? (
            <div className="rounded-[2rem] bg-surface p-10">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">
                Шукаємо...
              </h2>
              <p className="mt-2 text-muted">
                Запит: “{submittedState.q}”
              </p>
            </div>
          ) : error ? (
            <div className="rounded-[2rem] bg-red-50 p-10 text-red-700">
              <h2 className="text-2xl font-bold">Помилка</h2>
              <p className="mt-2">{error}</p>
            </div>
          ) : data ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
                <div>
                  <h2 className="text-[3rem] font-extrabold leading-none tracking-tight text-ink">
                    {data.total}
                  </h2>
                  <p className="mt-2 text-base text-muted">
                    результатів для “{data.query}”
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-full bg-surface px-6 py-3 text-sm font-bold text-ink hover:bg-surface-strong"
                >
                  Експортувати CSV
                </button>
              </div>

              {hasQueryTerms && (
                <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-muted">
                  <span className="font-medium">Леми:</span>
                  {data.metadata.queryTerms.map((term) => (
                    <span key={term} className="rounded bg-surface px-2 py-0.5 font-medium text-ink">
                      {term}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("exact")}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                    activeTab === "exact"
                      ? "bg-ink text-canvas"
                      : "bg-surface text-ink hover:bg-surface-strong"
                  }`}
                >
                  Повний збіг ({exactResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("partial")}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                    activeTab === "partial"
                      ? "bg-ink text-canvas"
                      : "bg-surface text-ink hover:bg-surface-strong"
                  }`}
                >
                  Частковий збіг ({partialResults.length})
                </button>
              </div>

              {filteredResults.length === 0 ? (
                <div className="rounded-[1.5rem] bg-surface p-8 text-muted">
                  Для цієї вкладки немає результатів.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredResults.map((item, index) => {
                    const rank = (page - 1) * DEFAULT_LIMIT + index + 1;
                    const osintBadges = getOsintBadges(item.tender.rawData);
                    return (
                      <Link
                        key={`${item.tender.id}-${rank}`}
                        href={`/tender/${item.tender.id}`}
                        className="group block rounded-[1.5rem] bg-canvas border border-surface-strong p-6 transition hover:border-ink hover:shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="inline-block rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted mb-3">
                              #{rank} • Оцінка {item.score.toFixed(3)}
                            </span>
                            <h3 className="text-xl font-bold tracking-tight text-ink group-hover:underline">
                              {item.tender.title || "Без назви"}
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-muted">
                              {item.tender.procuringEntity || "Замовник не вказаний"}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(item.tender.status)}`}>
                            {formatStatus(item.tender.status)}
                          </span>
                        </div>

                        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted line-clamp-3">
                          {excerptText(item.tender.description)}
                        </p>

                        {osintBadges.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {osintBadges.map((badge) => (
                              <span
                                key={`${item.tender.id}-${badge.id}`}
                                title={badge.description}
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${osintBadgeClass(
                                  badge.tone,
                                )}`}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.matchedFields && item.matchedFields.length > 0 && (
                          <div className="mt-5 border-t border-line/50 pt-4">
                            <p className="mb-2.5 text-[0.75rem] font-bold uppercase tracking-wider text-muted">
                              Знайдено у полях:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.matchedFields.map((field) => {
                                const fieldTerms = item.matchedTerms?.find((mt) => mt.field === field)?.terms || [];
                                return (
                                  <div key={field} className="group/field relative">
                                    <span className="inline-block rounded-md bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 cursor-help transition hover:bg-stone-200">
                                      {fieldLabelMap[field] || field}
                                    </span>
                                    {fieldTerms.length > 0 && (
                                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/field:opacity-100 transition-opacity z-50">
                                        <div className="whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs font-medium text-canvas shadow-lg">
                                          {fieldTerms.slice(0, 5).join(", ")}
                                          {fieldTerms.length > 5 && <span className="text-canvas/70"> +{fieldTerms.length - 5}</span>}
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-ink" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted">Сума:</span>
                            <span className="font-bold text-ink">
                              {formatCurrency(item.tender.valueAmount, item.tender.valueCurrency)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted">Дата:</span>
                            <span className="font-bold text-ink">
                              {formatDate(item.tender.datePublished)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-bold text-muted">
                  Сторінка {page} з {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-full bg-surface px-5 py-2.5 text-sm font-bold disabled:opacity-50"
                  >
                    Назад
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-full bg-ink text-canvas px-5 py-2.5 text-sm font-bold disabled:opacity-50"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-28 rounded-[2rem] bg-surface p-8">
            <h3 className="text-lg font-extrabold tracking-tight text-ink">
              Про пошук
            </h3>
            {data ? (
              <div className="mt-6 flex flex-col gap-5 text-sm">
                <div className="rounded-xl bg-accent/5 border border-accent/10 p-4">
                  <p className="font-semibold text-ink mb-1">
                    {data.metadata.profile === "da_bm25f_combined"
                      ? "Пошук з бустом для кодів"
                      : data.metadata.profile === "bm25f_default"
                        ? "Розумний пошук"
                        : "Базовий пошук"}
                  </p>
                  <p className="text-muted text-sm leading-relaxed">
                    {data.metadata.profile === "da_bm25f_combined"
                      ? "Додатково підвищує результати з точними збігами ЄДРПОУ та CPV-кодів."
                      : data.metadata.profile === "bm25f_default"
                        ? "Враховує де знайдено слово: в назві, в учасниках чи в документах."
                        : "Шукає слова будь-де в тендері без врахування контексту."}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-ink mb-3">Результати</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Знайдено тендерів</span>
                      <span className="font-bold text-ink">{data.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Всі слова знайдено</span>
                      <span className="font-bold text-green-600">{exactResults.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Частина слів</span>
                      <span className="font-bold text-amber-600">{partialResults.length}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-line pt-5">
                  <p className="font-semibold text-ink mb-3">Ваш запит</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.metadata.queryTerms.map((term, i) => (
                      <span key={i} className="bg-accent/10 text-accent px-2 py-0.5 rounded text-xs font-medium">
                        {term}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Слова приведені до базової форми
                  </p>
                </div>

                <div className="border-t border-line pt-5">
                  <p className="font-semibold text-ink mb-3">Швидкість</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, 100 - data.metadata.queryTimeMs / 10))}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted">{data.metadata.queryTimeMs} мс</span>
                  </div>
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted hover:text-ink">
                    Технічні параметри
                  </summary>
                  <div className="mt-2 space-y-1 text-muted font-mono bg-canvas rounded-lg p-3">
                    <p>profile: {data.metadata.profile || "bm25"}</p>
                    <p>k1: {data.metadata.k1}</p>
                    <p>b: {data.metadata.b}</p>
                  </div>
                </details>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Виконайте пошук, щоб побачити деталі
              </p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
