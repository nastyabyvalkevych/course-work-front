"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { StatsResponse } from "@/lib/types";

const STORAGE_KEY = "prozorro-insight-search-state";
const DEFAULT_SEARCH_PROFILE = "bm25f_default";

const sampleQueries = [
  "медикаменти",
  "ремонт доріг",
  "охорона",
  "харчування",
  "генератори",
];

const buildSearchState = (query: string) => {
  const trimmed = query.trim();
  return {
    activeTab: "partial",
    page: 1,
    formState: {
      q: trimmed,
      status: "",
      minValue: "",
      maxValue: "",
      dateFrom: "",
      dateTo: "",
      sort: "score",
      useMultifield: true,
      profile: DEFAULT_SEARCH_PROFILE,
    },
    submittedState: {
      q: trimmed,
      status: "",
      minValue: "",
      maxValue: "",
      dateFrom: "",
      dateTo: "",
      sort: "score",
      useMultifield: true,
      profile: DEFAULT_SEARCH_PROFILE,
    },
  };
};

const formatNumber = (num: number) =>
  new Intl.NumberFormat("uk-UA").format(num);

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchJson<StatsResponse>("/api/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  const startSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(buildSearchState(trimmed))
      );
    }
    router.push("/search");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startSearch(query);
  };

  return (
    <div className="flex flex-col gap-16 lg:gap-24">
      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-6 pt-8 lg:pt-16">
        <h1 className="max-w-4xl text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          Розумний пошук по тендерах{" "}
          <span className="text-accent">Prozorro</span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Знаходьте потрібні закупівлі швидше. Система розуміє, що знайти компанію
          в переможцях важливіше, ніж просто згадку в документах.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-xl mt-4">
          <div className="relative flex items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Компанія, товар, регіон, код..."
              className="h-14 w-full rounded-2xl bg-surface pl-5 pr-28 text-base font-medium text-ink placeholder:text-muted/50 transition focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 rounded-xl bg-accent px-6 text-sm font-bold text-white transition hover:bg-accent/90"
            >
              Шукати
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {sampleQueries.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => startSearch(sample)}
                className="rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-strong hover:text-ink"
              >
                {sample}
              </button>
            ))}
          </div>
        </form>

        {stats && (
          <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-sm text-muted">
            <span><strong className="text-ink">{formatNumber(stats.totalTenders)}</strong> тендерів в базі</span>
          </div>
        )}
      </section>

      {/* Why this search is better - simple explanation */}
      <section className="rounded-3xl bg-surface p-8 lg:p-10">
        <h2 className="text-2xl font-bold text-ink text-center mb-8">
          Чим цей пошук кращий за звичайний?
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-lg">✕</div>
              <div>
                <p className="font-semibold text-ink">Звичайний пошук</p>
                <p className="text-sm text-muted mt-1">
                  Шукає слово будь-де в тендері. &quot;ОККО&quot; в назві чи десь у PDF-додатку — однаково.
                  Результати — хаотичні.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-lg">✓</div>
              <div>
                <p className="font-semibold text-ink">Наш пошук</p>
                <p className="text-sm text-muted mt-1">
                  Розуміє <strong className="text-ink">де саме</strong> знайдено слово.
                  &quot;ОККО&quot; як переможець — вище. &quot;ОККО&quot; тільки в документах — нижче.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual example */}
      <section>
        <h2 className="text-2xl font-bold text-ink text-center mb-8">
          Приклад: шукаємо &quot;паливо ОККО&quot;
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-line p-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Результат #1 — висока оцінка</p>
            <p className="font-bold text-ink mb-3">Закупівля дизельного палива</p>
            <div className="space-y-2 text-sm">
              <p><span className="text-green-600 font-medium">Назва:</span> <span className="bg-yellow-100 px-1">паливо</span> дизельне</p>
              <p><span className="text-green-600 font-medium">Переможець:</span> ТОВ &quot;<span className="bg-yellow-100 px-1">ОККО</span>-Сервіс&quot;</p>
              <p><span className="text-green-600 font-medium">Учасник:</span> <span className="bg-yellow-100 px-1">ОККО</span>-Сервіс</p>
            </div>
            <p className="text-xs text-muted mt-4">Знайдено в 3 важливих полях → висока релевантність</p>
          </div>
          <div className="rounded-2xl border border-line p-6 opacity-60">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Результат #15 — низька оцінка</p>
            <p className="font-bold text-ink mb-3">Ремонт приміщення школи</p>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted font-medium">Назва:</span> ремонт приміщення</p>
              <p><span className="text-muted font-medium">Документи:</span> ...заправка на АЗС <span className="bg-yellow-100 px-1">ОККО</span>, <span className="bg-yellow-100 px-1">паливо</span> для генератора...</p>
            </div>
            <p className="text-xs text-muted mt-4">Знайдено тільки в документах → низька релевантність</p>
          </div>
        </div>
      </section>

      {/* Ukrainian language support */}
      <section className="rounded-3xl bg-gradient-to-br from-accent/5 to-accent/10 p-8 lg:p-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold text-ink mb-4">
              Розуміє українську мову
            </h2>
            <p className="text-muted leading-relaxed">
              Пошук &quot;медикамент&quot; знайде також &quot;медикаменти&quot;, &quot;медикаментів&quot;, &quot;медикаментами&quot;.
              Система автоматично приводить слова до базової форми.
            </p>
          </div>
          <div className="bg-white/80 rounded-2xl p-6">
            <p className="text-sm text-muted mb-3">Ви шукаєте:</p>
            <p className="font-mono text-lg text-ink mb-4">&quot;закупівля медикаментів&quot;</p>
            <p className="text-sm text-muted mb-2">Система також знайде:</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm">медикамент</span>
              <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm">медикаменти</span>
              <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm">закупівлі</span>
              <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm">закупівель</span>
            </div>
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section>
        <h2 className="text-2xl font-bold text-ink text-center mb-8">
          Кому це корисно?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-line p-6">
            <div className="text-3xl mb-4">📰</div>
            <h3 className="text-lg font-bold text-ink mb-2">Журналістам</h3>
            <p className="text-sm text-muted leading-relaxed">
              Швидко знайти всі тендери конкретної компанії.
              Побачити де вона перемагала, з ким конкурувала.
            </p>
          </div>
          <div className="rounded-2xl border border-line p-6">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-ink mb-2">Аналітикам</h3>
            <p className="text-sm text-muted leading-relaxed">
              Дослідити ринок закупівель в регіоні чи галузі.
              Виявити підозрілі патерни та аномалії.
            </p>
          </div>
          <div className="rounded-2xl border border-line p-6">
            <div className="text-3xl mb-4">🏢</div>
            <h3 className="text-lg font-bold text-ink mb-2">Бізнесу</h3>
            <p className="text-sm text-muted leading-relaxed">
              Моніторити тендери конкурентів.
              Знаходити можливості для участі в закупівлях.
            </p>
          </div>
        </div>
      </section>

      {/* OSINT signals - brief */}
      <section className="rounded-3xl bg-surface p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink mb-2">
              Автоматичне виявлення ризиків
            </h2>
            <p className="text-muted">
              Система позначає тендери з ознаками можливих порушень
            </p>
          </div>
          <Link href="/osint" className="text-sm font-semibold text-accent hover:underline whitespace-nowrap">
            Детальніше про індикатори →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="font-semibold text-amber-800 text-sm">Один учасник</p>
            <p className="text-xs text-amber-700/70 mt-1">Тендер без конкуренції</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="font-semibold text-red-800 text-sm">Схожі ціни</p>
            <p className="text-xs text-red-700/70 mt-1">Підозріло близькі ставки</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="font-semibold text-purple-800 text-sm">100% перемог</p>
            <p className="text-xs text-purple-700/70 mt-1">Компанія завжди виграє</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="font-semibold text-orange-800 text-sm">Ротація перемог</p>
            <p className="text-xs text-orange-700/70 mt-1">Компанії &quot;діляться&quot; тендерами</p>
          </div>
        </div>
      </section>

      {/* Technical note - collapsed */}
      <section className="text-center">
        <details className="inline-block text-left">
          <summary className="cursor-pointer text-sm text-muted hover:text-ink transition">
            Технічні деталі для спеціалістів ↓
          </summary>
          <div className="mt-4 bg-surface rounded-2xl p-6 max-w-2xl">
            <p className="text-sm text-muted leading-relaxed mb-4">
              Система використовує алгоритм <strong className="text-ink">BM25F</strong> (Best Match 25 for Fields) —
              розширення класичного BM25, що дозволяє призначати різні ваги різним полям документа.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-ink mb-2">Параметри</p>
                <p className="text-muted">k1 = 0.2, b = 0</p>
                <p className="text-muted">36 індексованих полів</p>
                <p className="text-muted">pymorphy2 лематизація</p>
              </div>
              <div>
                <p className="font-semibold text-ink mb-2">Результати</p>
                <p className="text-muted">+27% MAP vs baseline</p>
                <p className="text-muted">~100ms час відповіді</p>
                <p className="text-muted">Redis кешування</p>
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* CTA */}
      <section className="text-center py-4">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-8 py-4 text-base font-bold text-white transition hover:bg-accent"
        >
          Спробувати пошук
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-line pt-8 pb-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <p>Курсова робота | Пошукова система на основі BM25F | 121 Інженерія ПЗ</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-ink transition">Про проєкт</Link>
            <Link href="/search" className="hover:text-ink transition">Пошук</Link>
            <Link href="/osint" className="hover:text-ink transition">OSINT</Link>
            <Link href="/stats" className="hover:text-ink transition">Статистика</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
