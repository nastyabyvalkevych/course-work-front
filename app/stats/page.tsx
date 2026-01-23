"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { StatsResponse } from "@/lib/types";

export default function StatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<StatsResponse>("/api/stats")
      .then((response) => setData(response))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Аналітика</h1>
        <p className="mt-2 text-slate-600">
          Загальна статистика щодо індексу Prozorro.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500">Завантаження статистики...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Помилка: {error}</p>
        ) : data?.message ? (
          <p className="text-sm text-slate-500">{data.message}</p>
        ) : data ? (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="text-sm text-slate-500">Всього тендерів</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data.totalTenders}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="text-sm font-semibold text-slate-700">Статуси</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {data.statusDistribution.map((item) => (
                  <li key={item.status} className="flex justify-between">
                    <span>{item.status}</span>
                    <span className="font-medium text-slate-900">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="text-sm font-semibold text-slate-700">Топ-терми</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {data.topTerms.map((term) => (
                  <li key={term.term} className="flex justify-between">
                    <span>{term.term}</span>
                    <span className="font-medium text-slate-900">
                      {term.documentFrequency}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Немає даних.</p>
        )}
      </div>
    </section>
  );
}
