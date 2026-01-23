"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="rounded-3xl bg-white p-10 shadow-sm">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold leading-tight text-slate-900">
          Пошук тендерів Prozorro з якісними фільтрами
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Введіть ключові слова, щоб швидко знайти потрібні тендери та одразу
          перейти до аналітики.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="медикаменти київ"
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-base text-slate-900 focus:border-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-2xl bg-slate-900 px-6 py-3 text-base font-medium text-white transition hover:bg-slate-800"
        >
          Знайти
        </button>
      </form>

      <div className="mt-8 grid gap-4 text-sm text-slate-500 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-semibold text-slate-800">
            Швидкий пошук
          </p>
          <p className="mt-1">BM25 ранжування та підсвітка термінів.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-semibold text-slate-800">
            Гнучкі фільтри
          </p>
          <p className="mt-1">Статус, ціна, дата публікації.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-semibold text-slate-800">Переходи</p>
          <p className="mt-1">Швидкий доступ до Prozorro.gov.ua.</p>
        </div>
      </div>
    </section>
  );
}
