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
    <section className="grid gap-10 lg:gap-14">
      <div className="rounded-[2rem] bg-surface px-6 py-10 sm:px-10 lg:px-12">
        <p className="text-[0.8rem] font-bold uppercase tracking-wider text-muted">
          Аналітика індексу
        </p>
        <h1 className="mt-4 text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight text-ink uppercase">
          Стан пошукового
          <br />
          корпусу Prozorro
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Короткий оперативний зріз по загальній кількості тендерів, розподілу
          статусів і найчастіших термінів у побудованому індексі.
        </p>
      </div>

      <div>
        {isLoading ? (
          <div className="rounded-[2rem] bg-surface p-10 text-center">
            <p className="text-xl font-bold text-ink">
              Завантаження статистики...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-[2rem] bg-red-50 p-10 text-red-700">
            <h2 className="text-2xl font-bold">Помилка</h2>
            <p className="mt-2">{error}</p>
          </div>
        ) : data?.message ? (
          <div className="rounded-[2rem] bg-surface p-10">
            <p className="text-xl text-ink">{data.message}</p>
          </div>
        ) : data ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-[2rem] bg-surface p-8">
              <p className="text-[0.8rem] font-bold uppercase tracking-wider text-muted">
                Всього тендерів
              </p>
              <p className="mt-8 text-6xl font-extrabold leading-none tracking-tight text-ink">
                {data.totalTenders}
              </p>
            </div>

            <div className="rounded-[2rem] bg-surface p-8">
              <p className="text-[0.8rem] font-bold uppercase tracking-wider text-muted">
                Статуси
              </p>
              <ul className="mt-6 space-y-4 text-base font-semibold text-ink">
                {data.statusDistribution.map((item) => (
                  <li
                    key={item.status}
                    className="flex items-center justify-between gap-4 border-b border-surface-strong pb-4 last:border-b-0 last:pb-0"
                  >
                    <span>{item.status}</span>
                    <span className="font-bold text-muted">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] bg-surface p-8">
              <p className="text-[0.8rem] font-bold uppercase tracking-wider text-muted">
                Топ-терми
              </p>
              <ul className="mt-6 space-y-4 text-base font-semibold text-ink">
                {data.topTerms.map((term) => (
                  <li
                    key={term.term}
                    className="flex items-center justify-between gap-4 border-b border-surface-strong pb-4 last:border-b-0 last:pb-0"
                  >
                    <span className="max-w-[70%] truncate">{term.term}</span>
                    <span className="font-bold text-muted">
                      {term.documentFrequency}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface p-10">
            <p className="text-xl text-muted">Немає даних.</p>
          </div>
        )}
      </div>
    </section>
  );
}
