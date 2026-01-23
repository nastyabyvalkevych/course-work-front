"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/lib/api";
import { formatStatus, statusBadgeClass } from "@/lib/status";
import { SearchResponse, SearchResultItem } from "@/lib/types";

const DEFAULT_LIMIT = 20;

const statusOptions = ["", "active", "complete", "cancelled", "unsuccessful"];

const fieldLabelMap: Record<string, string> = {
  title: "Назва",
  description: "Опис",
  cpv: "CPV",
  cpvText: "Предмет закупівлі",
  itemsText: "Опис позицій",
  itemsQuantityText: "Кількість позицій",
  itemsUnit: "Одиниці виміру",
  status: "Статус",
  datePublished: "Дата публікації",
  dateModified: "Дата оновлення",
  valueAmount: "Очікувана сума",
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
  winnerValueAmount: "Сума переможця",
  winnerValueCurrency: "Валюта переможця",
  bidValuesText: "Суми пропозицій",
  bidUnitPricesText: "Ціна за одиницю",
  minBidValue: "Мінімальна пропозиція",
  maxBidValue: "Максимальна пропозиція",
  bidsCount: "Кількість пропозицій",
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

type SearchFormState = {
  q: string;
  status: string;
  minValue: string;
  maxValue: string;
  dateFrom: string;
  dateTo: string;
  sort: string;
  useMultifield: boolean;
};

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"exact" | "partial">("partial");
  const [formState, setFormState] = useState<SearchFormState>({
    q: "",
    status: "",
    minValue: "",
    maxValue: "",
    dateFrom: "",
    dateTo: "",
    sort: "score",
    useMultifield: false,
  });
  const [data, setData] = useState<SearchResponse | null>(null);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = searchParams.toString();
  const baseParamsKey = useMemo(() => {
    const baseParams = new URLSearchParams(searchParams.toString());
    baseParams.delete("page");
    return baseParams.toString();
  }, [searchParams]);
  const page = Number(searchParams.get("page") ?? "1");

  useEffect(() => {
    setFormState({
      q: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "",
      minValue: searchParams.get("minValue") ?? "",
      maxValue: searchParams.get("maxValue") ?? "",
      dateFrom: searchParams.get("dateFrom") ?? "",
      dateTo: searchParams.get("dateTo") ?? "",
      sort: searchParams.get("sort") ?? "score",
      useMultifield: searchParams.get("useMultifield") === "true",
    });
  }, [paramsKey, searchParams]);

  useEffect(() => {
    const query = searchParams.get("q")?.trim();
    if (!query) {
      setData(null);
      setResults([]);
      return;
    }

    const params = new URLSearchParams();
    params.set("q", query);
    params.set("limit", DEFAULT_LIMIT.toString());
    const offset = Math.max(0, (page - 1) * DEFAULT_LIMIT);
    if (offset) {
      params.set("offset", offset.toString());
    }
    [
      "status",
      "minValue",
      "maxValue",
      "dateFrom",
      "dateTo",
      "useMultifield",
    ].forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        params.set(key, value);
      }
    });

    setIsLoading(true);
    setError(null);
    fetchJson<SearchResponse>(`/api/search?${params.toString()}`)
      .then((response) => {
        setResults((prev) => {
          if (page === 1) {
            return response.results;
          }
          const existingIds = new Set(prev.map((item) => item.tender.id));
          const merged = [...prev];
          response.results.forEach((item) => {
            if (!existingIds.has(item.tender.id)) {
              merged.push(item);
            }
          });
          return merged;
        });
        setData({ ...response, results: response.results });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [baseParamsKey, page, searchParams]);

  useEffect(() => {
    setResults([]);
  }, [baseParamsKey]);

  const sortedResults = useMemo(() => {
    if (!data) {
      return [];
    }
    if (formState.sort === "date") {
      return [...results].sort((a, b) => {
        const dateA = a.tender.datePublished
          ? new Date(a.tender.datePublished).getTime()
          : 0;
        const dateB = b.tender.datePublished
          ? new Date(b.tender.datePublished).getTime()
          : 0;
        return dateB - dateA;
      });
    }
    return results;
  }, [data, formState.sort, results]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / DEFAULT_LIMIT))
    : 1;
  const currentParams = searchParams.toString();
  const rawQueryTerms = useMemo(() => {
    const rawQuery = searchParams.get("q") ?? "";
    return rawQuery.toLowerCase().match(/[0-9a-zа-яіїєґ]+/gi) ?? [];
  }, [searchParams]);
  const hasQueryTerms = rawQueryTerms.length > 0;

  const exactResults = useMemo(() => {
    if (!data) {
      return [];
    }
    if (!hasQueryTerms) {
      return [];
    }
    return sortedResults.filter((item) => {
      const matchedTerms = item.matchedTerms ?? [];
      if (matchedTerms.length === 0) {
        return false;
      }
      return matchedTerms.some((match) => {
        const normalizedTerms = match.terms.map((term) => term.toLowerCase());
        return rawQueryTerms.every((term) => normalizedTerms.includes(term));
      });
    });
  }, [data, hasQueryTerms, rawQueryTerms, sortedResults]);

  const partialResults = useMemo(() => {
    if (!data) {
      return [];
    }
    if (!hasQueryTerms) {
      return sortedResults;
    }
    const exactIds = new Set(exactResults.map((item) => item.tender.id));
    return sortedResults.filter((item) => !exactIds.has(item.tender.id));
  }, [data, exactResults, hasQueryTerms, sortedResults]);

  const filteredResults = activeTab === "exact" ? exactResults : partialResults;

  const updateSearchParams = (nextState: SearchFormState, nextPage = 1) => {
    const next = new URLSearchParams();
    if (nextState.q.trim()) {
      next.set("q", nextState.q.trim());
    }
    if (nextState.status) {
      next.set("status", nextState.status);
    }
    if (nextState.minValue) {
      next.set("minValue", nextState.minValue);
    }
    if (nextState.maxValue) {
      next.set("maxValue", nextState.maxValue);
    }
    if (nextState.dateFrom) {
      next.set("dateFrom", nextState.dateFrom);
    }
    if (nextState.dateTo) {
      next.set("dateTo", nextState.dateTo);
    }
    if (nextState.sort && nextState.sort !== "score") {
      next.set("sort", nextState.sort);
    }
    if (nextState.useMultifield) {
      next.set("useMultifield", "true");
    }
    if (nextPage > 1) {
      next.set("page", nextPage.toString());
    }
    router.push(`/search?${next.toString()}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateSearchParams(formState, 1);
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

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-600">
              Пошуковий запит
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={formState.q}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, q: event.target.value }))
                }
                placeholder="медикаменти київ"
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-base text-slate-900 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-6 py-3 text-base font-medium text-white transition hover:bg-slate-800"
              >
                Знайти
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">
                Статус
              </label>
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status || "Будь-який"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">
                Ціна від
              </label>
              <input
                value={formState.minValue}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    minValue: event.target.value,
                  }))
                }
                type="number"
                min={0}
                placeholder="1 000 000"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">
                Дата від
              </label>
              <input
                value={formState.dateFrom}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    dateFrom: event.target.value,
                  }))
                }
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">
                Дата до
              </label>
              <input
                value={formState.dateTo}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    dateTo: event.target.value,
                  }))
                }
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">
                Ціна до
              </label>
              <input
                value={formState.maxValue}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    maxValue: event.target.value,
                  }))
                }
                type="number"
                min={0}
                placeholder="10 000 000"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">
                Сортування
              </label>
              <select
                value={formState.sort}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    sort: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              >
                <option value="score">За релевантністю</option>
                <option value="date">За датою (новіші)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
                <span className="text-slate-600">BM25F (мультиполя)</span>
                <input
                  type="checkbox"
                  checked={formState.useMultifield}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      useMultifield: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-slate-900"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2" />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => updateSearchParams(formState, 1)}
                className="w-full rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Застосувати фільтри
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-sm">
        {!formState.q ? (
          <p className="text-base text-slate-500">
            Введіть запит, щоб побачити результати.
          </p>
        ) : isLoading ? (
          <p className="text-base text-slate-500">
            Завантаження результатів...
          </p>
        ) : error ? (
          <p className="text-base text-red-600">Помилка: {error}</p>
        ) : data ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {data.total} результатів за {data.metadata.queryTimeMs} мс
                </p>
                <p className="text-sm text-slate-500">
                  Запит: “{data.query}”. BM25 k1={data.metadata.k1}, b=
                  {data.metadata.b}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Експортувати CSV
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("exact")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === "exact"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Повний збіг ({exactResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("partial")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === "partial"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Частковий збіг ({partialResults.length})
                </button>
              </div>
              {filteredResults.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Немає результатів для вибраної категорії.
                </p>
              ) : (
                filteredResults.map((item, index) => (
                  <div
                    key={`${item.tender.id}-${index}`}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/tender/${item.tender.id}?from=${encodeURIComponent(
                          currentParams,
                        )}`}
                        className="text-lg font-semibold text-slate-900 hover:text-slate-700"
                      >
                        {item.tender.title || "Без назви"}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {item.tender.procuringEntity || "Невідомий замовник"}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-2">
                          <span className="text-slate-600">Статус:</span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                              item.tender.status,
                            )}`}
                          >
                            {formatStatus(item.tender.status)}
                          </span>
                        </span>
                        <span>
                          Сума:{" "}
                          {formatCurrency(
                            item.tender.valueAmount,
                            item.tender.valueCurrency,
                          )}
                        </span>
                        <span>
                          Дата: {formatDate(item.tender.datePublished)}
                        </span>
                      </div>
                      {(() => {
                        const matchedTerms = item.matchedTerms ?? [];

                        if (
                          item.highlights.length === 0 &&
                          matchedTerms.length === 0
                        ) {
                          return null;
                        }

                        return (
                          <div className="mt-2 flex flex-col gap-2 text-xs text-slate-500">
                            {matchedTerms.length > 0 && (
                              <div className="flex flex-col gap-3">
                                {matchedTerms.map((match) => {
                                  if (match.terms.length === 0) {
                                    return null;
                                  }
                                  const terms = Array.from(
                                    new Set(
                                      match.terms.map((term) =>
                                        term.toLowerCase(),
                                      ),
                                    ),
                                  );
                                  return (
                                    <div
                                      key={`${item.tender.id}-${match.field}`}
                                      className="flex flex-col items-start gap-2"
                                    >
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                        {fieldLabelMap[match.field] ??
                                          match.field}
                                      </span>
                                      <div className="flex flex-wrap gap-2">
                                        {terms.map((term) => (
                                          <span
                                            key={`${item.tender.id}-${match.field}-${term}`}
                                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                          >
                                            {term}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {item.highlights.length > 0 && (
                              <p>
                                Підсвітка термінів: {item.highlights.join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                      <p className="mt-2 text-sm text-slate-600">
                        {item.tender.description || "Опис відсутній."}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  updateSearchParams(formState, Math.max(1, page - 1))
                }
                className="rounded-xl border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Попередня сторінка
              </button>
              <span>
                Сторінка {page} з {totalPages}
              </span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    updateSearchParams(
                      formState,
                      Math.min(totalPages, page + 1),
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Наступна сторінка
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => updateSearchParams(formState, page + 1)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Завантажити ще
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-base text-slate-500">Нічого не знайдено.</p>
        )}
      </section>
    </div>
  );
}
