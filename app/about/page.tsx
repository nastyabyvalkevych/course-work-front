"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/api";
import { num } from "@/lib/risk";
import { BacktestList, RiskSummary } from "@/lib/types";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold text-white">{n}</div>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
      </div>
      <div className="ml-5 border-l-2 border-line pl-8 pb-2 space-y-4 text-muted leading-relaxed">{children}</div>
    </section>
  );
}

function Tool({ href, title, text, tag }: { href: string; title: string; text: string; tag?: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ink">{title}</p>
        {tag && <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted">{tag}</span>}
      </div>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </Link>
  );
}

export default function AboutPage() {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [backtests, setBacktests] = useState<BacktestList | null>(null);
  useEffect(() => {
    fetchJson<RiskSummary>("/api/risk/summary").then(setSummary).catch(() => null);
    fetchJson<BacktestList>("/api/risk/backtest").then(setBacktests).catch(() => null);
  }, []);
  const last = backtests?.items.at(-1);
  const p100 = last?.curve.find((c) => c.k === 100);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link href="/" className="text-sm text-accent hover:underline">← На головну</Link>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Магістерська робота, спеціальність 121</p>
      <h1 className="mt-2 mb-4 text-3xl font-extrabold text-ink lg:text-4xl">
        Програмне забезпечення виявлення ознак змови учасників публічних закупівель України на основі графових нейронних мереж
      </h1>
      <p className="mb-12 text-lg text-muted">Простими словами: що ми зробили, навіщо і що з цього вийшло.</p>

      {summary && (
        <div className="mb-12 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-4"><p className="text-xs uppercase text-muted">Тендерів у базі</p><p className="text-2xl font-extrabold text-ink">{num(summary.tendersInDatabase)}</p></div>
          <div className="rounded-2xl border border-line bg-surface p-4"><p className="text-xs uppercase text-muted">Компаній оцінено</p><p className="text-2xl font-extrabold text-ink">{num(summary.companiesScored)}</p></div>
          <div className="rounded-2xl border border-line bg-surface p-4"><p className="text-xs uppercase text-muted">Покараних АМКУ в реєстрі</p><p className="text-2xl font-extrabold text-ink">{num(summary.companiesInRegister)}</p></div>
        </div>
      )}

      <Step n={1} title="Проблема: змову видно лише між компаніями, а перевіряють по одній">
        <p>
          Змова на торгах — це коли кілька фірм домовляються, хто виграє, а решта «прикриває». Кожна з них окремо виглядає
          звичайно: якісь перемоги, якісь поразки, нормальні ціни. Підозріле лише те, <strong className="text-ink">як вони пов'язані</strong>:
          ходять на тендери тільки разом, виграють по черзі, більше ні з ким не конкурують.
        </p>
        <p>
          Сьогодні Антимонопольний комітет (АМКУ) відкриває справу за скаргою або за ручною перевіркою окремого тендера.
          У Prozorro понад мільйон конкурентних тендерів, перевірити всі руками неможливо, і саме зв'язки між компаніями
          при ручній перевірці найважче побачити.
        </p>
      </Step>

      <Step n={2} title="Ідея: намалювати мапу «хто з ким ходить на торги»">
        <p>
          Кожна компанія — точка. Якщо дві компанії подавали ставки в один тендер, між ними лінія. Зустрілись 20 разів —
          лінія товстіша. Так із {summary ? num(summary.tendersInDatabase) : "1,4 млн"} тендерів виходить мережа з 85 тисяч компаній
          і 1,2 млн зв'язків. Це називається граф спільних торгів.
        </p>
        <p>
          Для кожної компанії рахуємо 17 показників: як торгує (скільки тендерів, перемог, скільком замовникам), яке місце
          в мережі (скільки партнерів, чи вони замкнене коло) і як ставить ціни. Це ті самі ознаки, які аудитори OECD
          перевіряють руками, тільки порахованi для всіх одразу.
        </p>
      </Step>

      <Step n={3} title="Навчання: показуємо моделі тих, кого АМКУ вже покарав">
        <p>
          АМКУ публікує реєстр рішень про змови зі списком компаній. Це наші «правильні відповіді»: {summary ? num(summary.companiesInRegister) : "2,4 тис."} покараних компаній
          за 2023–2026 роки. Модель (графова нейронна мережа GraphSAGE) вчиться відрізняти їх від непокараних, дивлячись
          не лише на саму компанію, а й на її партнерів і партнерів партнерів.
        </p>
        <p>
          Дві чесні складності. Перша: «не покарана» не означає «чесна», АМКУ перевіряє малу частку ринку, тому модель
          навчена так, щоб не вважати всіх непокараних чесними. Друга: покарані компанії ми збирали з повною історією
          торгів, а випадкові суперники потрапили в дані частково. Щоб модель не навчилась відрізняти «спосіб збору»
          замість поведінки, ми зібрали контрольну групу випадкових компаній з такою ж повною історією і порівнюємо лише з ними.
        </p>
      </Step>

      <Step n={4} title="Перевірка: чи вгадує модель майбутні рішення АМКУ">
        <p>
          Ми не перевіряємо модель на тих же компаніях, на яких вона вчилась. Ми «відмотуємо час»: даємо їй лише дані до кінця
          року, просимо скласти список підозрілих, а потім дивимось, кого АМКУ покарав у наступні роки.
        </p>
        {p100 && last ? (
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-ink">
              Зі 100 компаній на верху списку наприкінці {last.cutoffYear} року <strong>{Math.round(p100.precision * 100)}</strong> отримали рішення
              АМКУ пізніше. Навмання було б близько {Math.round(last.baseRate * 100)}. Модель у {p100.lift.toFixed(1)} раза точніша за випадковий вибір.
            </p>
            <Link href="/risk/backtest" className="mt-2 inline-block text-sm font-semibold text-accent">Подивитись перевірку по роках →</Link>
          </div>
        ) : (
          <p>Результати перевірки по роках — на сторінці <Link href="/risk/backtest" className="text-accent">«Перевірка на минулому»</Link>.</p>
        )}
        <p>
          У наукових метриках: PR-AUC графової моделі 0,60–0,67 проти 0,56–0,58 у моделі без графа при 0,50 у випадкової;
          різниця статистично значуща (p ≤ 0,001). Це не вау-результат, і так має бути: ми порівнюємо з компаніями, що мають
          таку ж повну історію і таку ж активність, тобто в найважчих чесних умовах.
        </p>
      </Step>

      <Step n={5} title="Що вміє програма">
        <ul className="list-disc space-y-1 pl-5">
          <li><Link href="/risk" className="text-accent">Рейтинг ризику</Link>: кого перевіряти першим, з фільтрами за областю, активністю, повнотою історії.</li>
          <li>Картка компанії: ризик, ознаки, які його підняли, партнери по торгах і хто з них покараний; граф зв'язків.</li>
          <li>Картка тендера: ризик учасників і їхня спільна історія до підписання договору.</li>
          <li><Link href="/risk/map" className="text-accent">Мапа України</Link> за ризиком по областях.</li>
          <li><Link href="/risk/backtest" className="text-accent">Перевірка на минулому</Link>: прогноз на кінець року проти реальних рішень АМКУ.</li>
          <li>Пояснення через сусідів: яка саме компанія-партнер найбільше піднімає ризик.</li>
        </ul>
        <p>
          Це інструмент пріоритезації перевірок для АМКУ, замовників і журналістів, а не доказ порушення. Високий ризик означає
          «історія схожа на історії покараних», і нічого більше.
        </p>
      </Step>

      <Step n={6} title="Як це зроблено">
        <p>
          Дані: PostgreSQL 17, 37 ГБ, повні JSON тендерів і плоска таблиця участей на 4 млн рядків. Конвеєр і моделі: Python
          (pandas, networkx, PyTorch Geometric, LightGBM). API: NestJS з кешем Redis, який можна вимкнути без втрати
          працездатності. Інтерфейс: Next.js і d3. Надійність: 58 автоматичних тестів, навантажувальні тести, fault injection
          і модуль самооцінки надійності на Марківських моделях.
        </p>
      </Step>

      <h2 className="mb-4 text-xl font-bold text-ink">Усі інструменти</h2>
      <div className="mb-12 grid gap-3 sm:grid-cols-2">
        <Tool href="/risk" title="Рейтинг ризику змови" text="Головний результат роботи: список компаній за ризиком, картки, граф." />
        <Tool href="/risk/map" title="Мапа України" text="Ризик і частка покараних по областях." />
        <Tool href="/risk/backtest" title="Перевірка на минулому" text="Прогноз на кінець року проти реальних рішень АМКУ." />
        <Tool href="/reliability" title="Надійність системи" text="Марківська модель: ймовірність коректної відповіді, MTTF, чутливість модулів, стан бази й кешу наживо." tag="інженерія" />
        <Tool href="/osint" title="Індикатори OECD" text="Базовий підхід, з якого починали: єдиний учасник, пари співучасників, аномальна частка перемог, HHI. Те, з чим порівнюємо граф." tag="базовий підхід" />
        <Tool href="/stats" title="Статистика бази" text="Скільки тендерів, документів і термінів у сховищі." tag="службова" />
        <Tool href="/search" title="Пошук по тендерах" text="Багатопольовий BM25F-пошук з курсової роботи, на якій виріс цей проєкт." tag="курсова" />
      </div>

      <p className="text-sm text-muted">
        Джерела даних: <a href="https://prozorro.gov.ua" className="text-accent">Prozorro</a> (публічний API і портал), реєстр рішень АМКУ на{" "}
        <a href="https://data.gov.ua" className="text-accent">data.gov.ua</a>. Код і документація дослідження — у репозиторії проєкту.
      </p>
    </div>
  );
}
