"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← На головну
        </Link>
      </div>

      <h1 className="text-3xl lg:text-4xl font-extrabold text-ink mb-4">
        Про дослідження
      </h1>
      <p className="text-lg text-muted mb-12">
        Пояснюємо простими словами, що ми зробили і навіщо
      </p>

      {/* Step 1 */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">1</div>
          <h2 className="text-xl font-bold text-ink">Проблема: пошук в Prozorro не дуже розумний</h2>
        </div>
        <div className="pl-13 ml-5 border-l-2 border-line pl-8 pb-8">
          <p className="text-muted leading-relaxed mb-4">
            Уявіть: ви журналіст і хочете знайти всі тендери, де компанія "ОККО" перемогла.
            Ви вводите "ОККО" в пошук Prozorro.
          </p>
          <div className="bg-red-50 rounded-xl p-4 mb-4">
            <p className="font-semibold text-red-800 mb-2">Що отримуєте:</p>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Тендер де ОККО переможець — добре!</li>
              <li>• Тендер де в PDF написано "заправка на АЗС ОККО" — не те...</li>
              <li>• Тендер де хтось в коментарі згадав ОККО — взагалі не те!</li>
            </ul>
          </div>
          <p className="text-muted leading-relaxed">
            <strong className="text-ink">Проблема:</strong> звичайний пошук не розрізняє,
            де саме знайдено слово. Для нього "ОККО в назві переможця" і "ОККО десь в документах" — однаково.
          </p>
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">2</div>
          <h2 className="text-xl font-bold text-ink">Ідея: а що якщо враховувати контекст?</h2>
        </div>
        <div className="pl-13 ml-5 border-l-2 border-line pl-8 pb-8">
          <p className="text-muted leading-relaxed mb-4">
            Ми подумали: тендер — це не просто текст. Це структурований документ з полями:
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface rounded-lg p-3">
              <p className="font-semibold text-ink text-sm">Назва тендера</p>
              <p className="text-xs text-muted">Найважливіше поле</p>
            </div>
            <div className="bg-surface rounded-lg p-3">
              <p className="font-semibold text-ink text-sm">Переможець</p>
              <p className="text-xs text-muted">Дуже важливе</p>
            </div>
            <div className="bg-surface rounded-lg p-3">
              <p className="font-semibold text-ink text-sm">Учасники</p>
              <p className="text-xs text-muted">Важливе</p>
            </div>
            <div className="bg-surface rounded-lg p-3">
              <p className="font-semibold text-ink text-sm">Опис</p>
              <p className="text-xs text-muted">Середньої важливості</p>
            </div>
            <div className="bg-surface rounded-lg p-3">
              <p className="font-semibold text-ink text-sm">Документи</p>
              <p className="text-xs text-muted">Менш важливе</p>
            </div>
            <div className="bg-surface rounded-lg p-3">
              <p className="font-semibold text-ink text-sm">+ ще 30 полів</p>
              <p className="text-xs text-muted">Різної важливості</p>
            </div>
          </div>
          <p className="text-muted leading-relaxed">
            <strong className="text-ink">Ідея:</strong> якщо слово знайдено в назві — це важливіше,
            ніж якщо воно десь в документах. Треба це враховувати при ранжуванні!
          </p>
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">3</div>
          <h2 className="text-xl font-bold text-ink">Рішення: алгоритм BM25F</h2>
        </div>
        <div className="pl-13 ml-5 border-l-2 border-line pl-8 pb-8">
          <p className="text-muted leading-relaxed mb-4">
            Виявилось, такий алгоритм вже існує! Називається <strong className="text-ink">BM25F</strong>
            (Best Match 25 for Fields). Його використовують пошукові системи типу Elasticsearch.
          </p>

          <div className="bg-surface rounded-xl p-5 mb-4">
            <p className="font-semibold text-ink mb-3">Як працює BM25F (спрощено):</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">1.</span>
                <p className="text-muted">Кожному полю призначається <strong className="text-ink">вага</strong> (число)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">2.</span>
                <p className="text-muted">Назва = 4.0, Переможець = 2.5, Документи = 0.5</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">3.</span>
                <p className="text-muted">При пошуку система рахує: "знайшли слово в назві? множимо на 4"</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">4.</span>
                <p className="text-muted">Результат: тендери з важливими збігами — вище в списку</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-amber-800 text-sm">
              <strong>Аналогія:</strong> це як оцінювати резюме. Якщо людина написала "Python" в навичках —
              це важливіше, ніж якщо "Python" згадується десь в описі хобі.
            </p>
          </div>
        </div>
      </section>

      {/* Step 4 */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">4</div>
          <h2 className="text-xl font-bold text-ink">Експеримент: підбір найкращих ваг</h2>
        </div>
        <div className="pl-13 ml-5 border-l-2 border-line pl-8 pb-8">
          <p className="text-muted leading-relaxed mb-4">
            Але які саме ваги призначити? Чому назва = 4.0, а не 3.0 чи 5.0?
            Ми провели експерименти.
          </p>

          <div className="bg-surface rounded-xl p-5 mb-4">
            <p className="font-semibold text-ink mb-3">Що ми зробили:</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-accent font-bold">→</span>
                <p className="text-muted">Взяли реальні дані: <strong className="text-ink">20,000+ тендерів</strong> з Prozorro</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent font-bold">→</span>
                <p className="text-muted">Проіндексували <strong className="text-ink">36 полів</strong> кожного тендера</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent font-bold">→</span>
                <p className="text-muted">Склали тестові запити з правильними відповідями</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent font-bold">→</span>
                <p className="text-muted">Перебрали різні комбінації ваг (grid search)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent font-bold">→</span>
                <p className="text-muted">Виміряли точність кожної комбінації</p>
              </div>
            </div>
          </div>

          <p className="text-muted leading-relaxed">
            <strong className="text-ink">Grid search</strong> — це коли ми перебираємо всі можливі комбінації параметрів
            і дивимось, яка дає найкращий результат. Як підбирати температуру духовки для пирога — пробуємо різні і дивимось, який смачніший.
          </p>
        </div>
      </section>

      {/* Step 5 */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">5</div>
          <h2 className="text-xl font-bold text-ink">Додаткова фіча: українська мова</h2>
        </div>
        <div className="pl-13 ml-5 border-l-2 border-line pl-8 pb-8">
          <p className="text-muted leading-relaxed mb-4">
            Ще одна проблема: українська мова має багато форм одного слова.
          </p>

          <div className="bg-surface rounded-xl p-5 mb-4">
            <p className="font-semibold text-ink mb-2">Приклад:</p>
            <p className="text-muted mb-3">Ви шукаєте "медикамент", але в тендері написано "медикаментів".</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">медикамент</span>
              <span className="text-muted">≠</span>
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">медикаменти</span>
              <span className="text-muted">≠</span>
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">медикаментів</span>
              <span className="text-muted">≠</span>
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">медикаментами</span>
            </div>
            <p className="text-sm text-muted mt-3">Для комп'ютера це різні слова!</p>
          </div>

          <div className="bg-green-50 rounded-xl p-5">
            <p className="font-semibold text-green-800 mb-2">Наше рішення: лематизація</p>
            <p className="text-green-700 text-sm mb-3">
              Ми використали бібліотеку <strong>pymorphy2</strong>, яка приводить слова до базової форми:
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">медикаментів</span>
              <span className="text-green-600">→</span>
              <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm font-semibold">медикамент</span>
            </div>
            <p className="text-sm text-green-700 mt-3">Тепер пошук знаходить всі форми слова!</p>
          </div>
        </div>
      </section>

      {/* Step 6 */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">6</div>
          <h2 className="text-xl font-bold text-ink">Результат: +27% точності</h2>
        </div>
        <div className="pl-13 ml-5 border-l-2 border-line pl-8 pb-8">
          <p className="text-muted leading-relaxed mb-4">
            Ми порівняли наш пошук з базовим і виміряли різницю.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-100 rounded-xl p-5">
              <p className="font-semibold text-gray-700 mb-2">Базовий пошук (BM25)</p>
              <div className="text-3xl font-bold text-gray-600 mb-1">73%</div>
              <p className="text-sm text-gray-500">точність (MAP)</p>
            </div>
            <div className="bg-green-100 rounded-xl p-5">
              <p className="font-semibold text-green-800 mb-2">Наш пошук (BM25F)</p>
              <div className="text-3xl font-bold text-green-700 mb-1">100%</div>
              <p className="text-sm text-green-600">точність (MAP) — на 27% краще</p>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5">
            <p className="font-semibold text-ink mb-2">Що таке MAP?</p>
            <p className="text-muted text-sm leading-relaxed">
              <strong className="text-ink">Mean Average Precision</strong> — метрика якості пошуку.
              Простими словами: наскільки часто потрібні результати знаходяться вгорі списку, а не десь внизу.
              Чим вище MAP — тим краще пошук розуміє, що ви шукаєте.
            </p>
          </div>
        </div>
      </section>

      {/* Step 7 */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">7</div>
          <h2 className="text-xl font-bold text-ink">Бонус: виявлення підозрілих тендерів</h2>
        </div>
        <div className="pl-13 ml-5 border-l-2 border-line pl-8 pb-8">
          <p className="text-muted leading-relaxed mb-4">
            Окрім пошуку, ми додали автоматичне виявлення ознак можливих порушень
            за методологією OECD (міжнародна організація економічного співробітництва).
          </p>

          <div className="space-y-3">
            <div className="bg-amber-50 rounded-lg p-4 flex items-start gap-3">
              <span className="text-amber-600 text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-800">Один учасник</p>
                <p className="text-sm text-amber-700">Тендер без конкуренції — можливо, умови "заточені" під когось</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">Схожі ціни</p>
                <p className="text-sm text-red-700">Учасники подали майже однакові ціни — можлива змова</p>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 flex items-start gap-3">
              <span className="text-purple-600 text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-purple-800">100% перемог</p>
                <p className="text-sm text-purple-700">Компанія завжди виграє — статистично підозріло</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="bg-accent/5 rounded-3xl p-8 mb-12">
        <h2 className="text-xl font-bold text-ink mb-4">Підсумок</h2>
        <div className="space-y-3 text-muted">
          <p>
            <strong className="text-ink">Проблема:</strong> звичайний пошук не розрізняє контекст — де саме знайдено слово.
          </p>
          <p>
            <strong className="text-ink">Рішення:</strong> алгоритм BM25F з вагами для різних полів + українська лематизація.
          </p>
          <p>
            <strong className="text-ink">Результат:</strong> пошук став на 27% точнішим, релевантні результати тепер вгорі.
          </p>
          <p>
            <strong className="text-ink">Бонус:</strong> автоматичне виявлення підозрілих тендерів за 7 індикаторами.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pb-8">
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
    </div>
  );
}
