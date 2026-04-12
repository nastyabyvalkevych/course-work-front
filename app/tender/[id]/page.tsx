import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { fetchJson } from "@/lib/api";
import { getOsintBadges, osintBadgeClass } from "@/lib/osint";
import { formatStatus, statusBadgeClass } from "@/lib/status";
import { Tender } from "@/lib/types";

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
    timeStyle: "short",
  }).format(date);
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "—";
};

const formatAddress = (address?: {
  region?: string;
  locality?: string;
  streetAddress?: string;
  postalCode?: string;
  countryName?: string;
}) => {
  if (!address) {
    return "—";
  }
  return [
    address.countryName,
    address.region,
    address.locality,
    address.streetAddress,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
};

const formatContact = (contact?: {
  name?: string;
  email?: string;
  telephone?: string;
}) => {
  if (!contact) {
    return "—";
  }
  return [contact.name, contact.email, contact.telephone]
    .filter(Boolean)
    .join(" · ");
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RawTenderer = {
  name?: string;
  identifier?: { id?: string; legalName?: string };
  address?: {
    region?: string;
    locality?: string;
    streetAddress?: string;
    postalCode?: string;
    countryName?: string;
  };
  contactPoint?: {
    name?: string;
    email?: string;
    telephone?: string;
  };
};

type RawBid = {
  id?: string;
  status?: string;
  date?: string;
  value?: { amount?: number | null; currency?: string | null };
  tenderers?: RawTenderer[];
};

type RawAward = {
  id?: string;
  status?: string;
  date?: string;
  value?: { amount?: number | null; currency?: string | null };
  suppliers?: Array<{ name?: string }>;
};

type RawContract = {
  id?: string;
  status?: string;
  date?: string;
  contractID?: string;
  value?: { amount?: number | null; currency?: string | null };
};

export default async function TenderPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!resolvedParams.id) {
    notFound();
  }

  const rawFrom = resolvedSearchParams?.from;
  if (typeof rawFrom === "string" && rawFrom.length > 0) {
    redirect(`/tender/${encodeURIComponent(resolvedParams.id)}`);
  }

  let tender: Tender | null = null;
  try {
    tender = await fetchJson<Tender>(
      `/api/tenders/${encodeURIComponent(resolvedParams.id)}`,
    );
  } catch {
    tender = null;
  }

  if (!tender) {
    notFound();
  }

  const raw =
    tender.rawData && typeof tender.rawData === "object"
      ? (tender.rawData as Record<string, unknown>)
      : null;
  const items = Array.isArray(raw?.items) ? raw?.items : [];
  const bids = Array.isArray(raw?.bids) ? (raw.bids as RawBid[]) : [];
  const awards = Array.isArray(raw?.awards) ? (raw.awards as RawAward[]) : [];
  const contracts = Array.isArray(raw?.contracts) ? (raw.contracts as RawContract[]) : [];
  const tenderers = bids.flatMap((bid) =>
    Array.isArray(bid?.tenderers) ? bid.tenderers : [],
  );
  const osintBadges = getOsintBadges(tender.rawData);
  const officialTenderId =
    typeof raw?.tenderID === "string" && raw.tenderID.length > 0
      ? raw.tenderID
      : tender.prozorroId;

  const backLink = "/search";

  return (
    <section className="flex flex-col gap-8 lg:gap-10">
      <div className="flex flex-col gap-4">
        <Link href={backLink} className="text-sm font-semibold uppercase tracking-wider text-muted hover:text-ink">
          ← Назад до результатів
        </Link>
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
          {tender.title || "Без назви"}
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <span className="rounded-full bg-surface px-4 py-1.5 text-sm font-bold text-muted">
            ID: {tender.prozorroId}
          </span>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${statusBadgeClass(
              tender.status,
            )}`}
          >
            {formatStatus(tender.status)}
          </span>
        </div>
        {osintBadges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {osintBadges.map((badge) => (
              <span
                key={badge.id}
                title={badge.description}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${osintBadgeClass(
                  badge.tone,
                )}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[2rem] bg-surface p-8 sm:p-10">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 text-base text-ink">
            <p>
              <span className="font-bold text-muted uppercase tracking-wider text-xs block mb-1">Замовник</span>
              {tender.procuringEntity || "—"}
            </p>
            <p>
              <span className="font-bold text-muted uppercase tracking-wider text-xs block mb-1">Очікувана сума</span>
              <span className="text-xl font-extrabold">{formatCurrency(tender.valueAmount, tender.valueCurrency)}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-bold text-muted uppercase tracking-wider text-xs block mb-1">Дата публікації</span>
                {formatDate(tender.datePublished)}
              </p>
              <p>
                <span className="font-bold text-muted uppercase tracking-wider text-xs block mb-1">Остання зміна</span>
                {formatDate(tender.dateModified)}
              </p>
            </div>
          </div>
          <div className="space-y-4 text-base text-ink">
            <p>
              <span className="font-bold text-muted uppercase tracking-wider text-xs block mb-1">CPV коди</span>
              {tender.cpvCodes?.length ? tender.cpvCodes.join(", ") : "—"}
            </p>
            <div className="mt-6">
              <p className="text-sm font-semibold text-muted mb-3">
                Офіційне посилання на закупівлю
              </p>
              <a
                href={`https://prozorro.gov.ua/tender/${officialTenderId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl bg-ink px-6 py-3 text-sm font-bold text-canvas hover:bg-accent-strong transition-colors"
              >
                Відкрити на сайті Prozorro
              </a>
            </div>
          </div>
        </div>
      </div>

      {osintBadges.length > 0 && (
        <div className="rounded-[2rem] border border-red-100 bg-red-50/60 p-8 sm:p-10">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-ink">
                OSINT-сигнали
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Це автоматичні статистичні індикатори для пріоритезації ручної перевірки, а не доказ порушення.
              </p>
            </div>
            <div className="grid gap-3">
              {osintBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-[1.25rem] border border-white/70 bg-canvas p-4"
                >
                  <p className="text-sm font-extrabold text-ink">{badge.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {badge.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[2rem] bg-surface p-8 sm:p-10">
        <h2 className="text-xl font-extrabold tracking-tight text-ink mb-6">Опис закупівлі</h2>
        <p className="text-base leading-relaxed text-muted whitespace-pre-wrap">
          {tender.description || "Детальний опис відсутній."}
        </p>
      </div>

      <div className="rounded-[2rem] bg-surface p-8 sm:p-10">
        <h2 className="text-xl font-extrabold tracking-tight text-ink mb-8">Матеріали тендеру (Raw Data)</h2>
        {raw ? (
          <div className="flex flex-col gap-8">
            <div className="grid gap-6 md:grid-cols-2 bg-canvas rounded-[1.5rem] p-6 border border-line">
              <div className="space-y-3 text-sm text-ink">
                <p>
                  <span className="font-bold text-muted">Tender ID:</span>{" "}
                  {formatValue(raw?.tenderID)}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-muted">Статус:</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${statusBadgeClass(
                      raw?.status as string | null | undefined,
                    )}`}
                  >
                    {formatStatus(raw?.status as string | null | undefined)}
                  </span>
                </div>
                <p>
                  <span className="font-bold text-muted">Метод:</span>{" "}
                  {formatValue(raw?.procurementMethodType)}
                </p>
                <p>
                  <span className="font-bold text-muted">Категорія:</span>{" "}
                  {formatValue(raw?.mainProcurementCategory)}
                </p>
              </div>
              <div className="space-y-3 text-sm text-ink">
                <p>
                  <span className="font-bold text-muted">Період тендеру:</span>{" "}
                  {formatDate((raw as Record<string, Record<string, string>>)?.tenderPeriod?.startDate)} — {formatDate((raw as Record<string, Record<string, string>>)?.tenderPeriod?.endDate)}
                </p>
                <p>
                  <span className="font-bold text-muted">Період оцінки:</span>{" "}
                  {formatDate((raw as Record<string, Record<string, string>>)?.awardPeriod?.startDate)} — {formatDate((raw as Record<string, Record<string, string>>)?.awardPeriod?.endDate)}
                </p>
                <p>
                  <span className="font-bold text-muted">Очікувана вартість:</span>{" "}
                  <span className="font-bold">{formatCurrency((raw as Record<string, Record<string, number | string>>)?.value?.amount as number | undefined, (raw as Record<string, Record<string, number | string>>)?.value?.currency as string | undefined)}</span>
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-canvas border border-line p-6">
              <h3 className="text-base font-extrabold text-ink mb-4">Предмет закупівлі</h3>
              <div className="grid gap-4">
                {items.length ? (
                  items.map((item, index) => (
                    <div key={`${item?.id ?? index}`} className="rounded-xl border border-surface-strong bg-surface p-5">
                      <p className="text-base font-bold text-ink">
                        {item?.description || "Без опису"}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-muted">
                        <p>
                          <span className="font-bold">Кількість:</span> {formatValue(item?.quantity)} {formatValue(item?.unit?.name)}
                        </p>
                        <p>
                          <span className="font-bold">Класифікація:</span> {formatValue(item?.classification?.id)} — {formatValue(item?.classification?.description)}
                        </p>
                        <p><span className="font-bold">Доставка:</span> {formatAddress(item?.deliveryAddress)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-muted">Немає даних по позиціях.</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-canvas border border-line p-6">
                <h3 className="text-base font-extrabold text-ink mb-4">Учасники</h3>
                <div className="space-y-4">
                  {tenderers.length ? (
                    tenderers.map((tenderer, index) => (
                      <div key={`${tenderer?.identifier?.id ?? index}`} className="border-b border-surface-strong pb-4 last:border-0 last:pb-0">
                        <p className="font-bold text-ink">
                          {formatValue(tenderer?.name || tenderer?.identifier?.legalName)}
                        </p>
                        <div className="mt-2 text-sm text-muted space-y-1">
                          <p>ЄДРПОУ: {formatValue(tenderer?.identifier?.id)}</p>
                          <p>{formatAddress(tenderer?.address)}</p>
                          <p>{formatContact(tenderer?.contactPoint)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-muted">Немає даних по учасниках.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-canvas border border-line p-6">
                <h3 className="text-base font-extrabold text-ink mb-4">Пропозиції</h3>
                <div className="space-y-4">
                  {bids.length ? (
                    bids.map((bid, index) => (
                      <div key={`${bid?.id ?? index}`} className="rounded-xl border border-surface-strong bg-surface p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(bid?.status)}`}>
                            {formatStatus(bid?.status)}
                          </span>
                          <span className="font-bold text-ink">
                            {formatCurrency(bid?.value?.amount, bid?.value?.currency)}
                          </span>
                        </div>
                        <div className="text-sm text-muted space-y-1">
                          <p>Дата: {formatDate(bid?.date)}</p>
                          <p className="truncate">
                            Учасники: {Array.isArray(bid?.tenderers)
                              ? bid.tenderers.map((t) => t?.name).filter(Boolean).join(", ")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-muted">Немає пропозицій.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-canvas border border-line p-6">
                <h3 className="text-base font-extrabold text-ink mb-4">Нагороди</h3>
                <div className="space-y-4">
                  {awards.length ? (
                    awards.map((award, index) => (
                      <div key={`${award?.id ?? index}`} className="rounded-xl border border-surface-strong bg-surface p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(award?.status)}`}>
                            {formatStatus(award?.status)}
                          </span>
                          <span className="font-bold text-ink">
                            {formatCurrency(award?.value?.amount, award?.value?.currency)}
                          </span>
                        </div>
                        <div className="text-sm text-muted space-y-1">
                          <p>Дата: {formatDate(award?.date)}</p>
                          <p className="truncate">
                            Постачальник: {Array.isArray(award?.suppliers)
                              ? award.suppliers.map((s) => s?.name).filter(Boolean).join(", ")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-muted">Немає нагород.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-canvas border border-line p-6">
                <h3 className="text-base font-extrabold text-ink mb-4">Контракти</h3>
                <div className="space-y-4">
                  {contracts.length ? (
                    contracts.map((contract, index) => (
                      <div key={`${contract?.id ?? index}`} className="rounded-xl border border-surface-strong bg-surface p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(contract?.status)}`}>
                            {formatStatus(contract?.status)}
                          </span>
                          <span className="font-bold text-ink">
                            {formatCurrency(contract?.value?.amount, contract?.value?.currency)}
                          </span>
                        </div>
                        <div className="text-sm text-muted space-y-1">
                          <p>ID: {formatValue(contract?.contractID ?? contract?.id)}</p>
                          <p>Дата: {formatDate(contract?.date)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-muted">Немає контрактів.</p>
                  )}
                </div>
              </div>
            </div>

            <details className="rounded-[1.5rem] border border-line bg-canvas p-6 group">
              <summary className="cursor-pointer text-base font-extrabold text-ink outline-none">
                Відобразити вихідні дані JSON
              </summary>
              <pre className="mt-6 max-h-[500px] overflow-auto rounded-xl bg-surface border border-surface-strong p-6 text-xs text-muted font-mono">
                {JSON.stringify(raw, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <p className="mt-4 text-base font-semibold text-muted">Детальні JSON-дані відсутні.</p>
        )}
      </div>
    </section>
  );
}
