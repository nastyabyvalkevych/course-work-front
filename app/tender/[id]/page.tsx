import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchJson } from "@/lib/api";
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
  searchParams?: Promise<{ from?: string }>;
};

export default async function TenderPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!resolvedParams.id) {
    notFound();
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
      ? (tender.rawData as Record<string, any>)
      : null;
  const items = Array.isArray(raw?.items) ? raw?.items : [];
  const bids = Array.isArray(raw?.bids) ? raw?.bids : [];
  const awards = Array.isArray(raw?.awards) ? raw?.awards : [];
  const contracts = Array.isArray(raw?.contracts) ? raw?.contracts : [];
  const documents = Array.isArray(raw?.documents) ? raw?.documents : [];
  const milestones = Array.isArray(raw?.milestones) ? raw?.milestones : [];
  const criteria = Array.isArray(raw?.criteria) ? raw?.criteria : [];
  const tenderers = bids.flatMap((bid) =>
    Array.isArray(bid?.tenderers) ? bid.tenderers : [],
  );

  const backLink = resolvedSearchParams?.from
    ? `/search?${decodeURIComponent(resolvedSearchParams.from)}`
    : "/search";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={backLink} className="text-sm text-slate-500 hover:text-slate-700">
          ← Назад до результатів
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">
          {tender.title || "Без назви"}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>ID: {tender.prozorroId}</span>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
              tender.status,
            )}`}
          >
            {formatStatus(tender.status)}
          </span>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Замовник:</span>{" "}
              {tender.procuringEntity || "—"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Сума:</span>{" "}
              {formatCurrency(tender.valueAmount, tender.valueCurrency)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Дата публікації:</span>{" "}
              {formatDate(tender.datePublished)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Оновлено:</span>{" "}
              {formatDate(tender.dateModified)}
            </p>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">CPV коди:</span>{" "}
              {tender.cpvCodes?.length ? tender.cpvCodes.join(", ") : "—"}
            </p>
            <p className="text-sm text-slate-500">
              Prozorro посилання відкриється в новій вкладці.
            </p>
            <a
              href={`https://prozorro.gov.ua/tender/${tender.prozorroId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Переглянути на Prozorro.gov.ua
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Опис</h2>
        <p className="mt-4 text-sm text-slate-600">
          {tender.description || "Опис відсутній."}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Дані Prozorro</h2>
        {raw ? (
          <div className="mt-6 flex flex-col gap-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-900">Tender ID:</span>{" "}
                  {formatValue(raw?.tenderID)}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">Статус:</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                      raw?.status,
                    )}`}
                  >
                    {formatStatus(raw?.status)}
                  </span>
                </div>
                <p>
                  <span className="font-medium text-slate-900">Власник:</span>{" "}
                  {formatValue(raw?.owner)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Метод:</span>{" "}
                  {formatValue(raw?.procurementMethodType)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Категорія:</span>{" "}
                  {formatValue(raw?.mainProcurementCategory)}
                </p>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-900">Створено:</span>{" "}
                  {formatDate(raw?.dateCreated)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Оновлено:</span>{" "}
                  {formatDate(raw?.dateModified)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Період тендеру:</span>{" "}
                  {formatDate(raw?.tenderPeriod?.startDate)} — {formatDate(raw?.tenderPeriod?.endDate)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Період оцінки:</span>{" "}
                  {formatDate(raw?.awardPeriod?.startDate)} — {formatDate(raw?.awardPeriod?.endDate)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Очікувана вартість:</span>{" "}
                  {formatCurrency(raw?.value?.amount, raw?.value?.currency)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Замовник</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{formatValue(raw?.procuringEntity?.name)}</p>
                <p>
                  ЄДРПОУ: {formatValue(raw?.procuringEntity?.identifier?.id)}
                </p>
                <p>{formatAddress(raw?.procuringEntity?.address)}</p>
                <p>{formatContact(raw?.procuringEntity?.contactPoint)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Предмет закупівлі</h3>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {items.length ? (
                  items.map((item, index) => (
                    <div key={`${item?.id ?? index}`} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">
                        {item?.description || "Без опису"}
                      </p>
                      <p className="mt-2">
                        Кількість: {formatValue(item?.quantity)} {formatValue(item?.unit?.name)}
                      </p>
                      <p>
                        Класифікація: {formatValue(item?.classification?.id)} — {formatValue(item?.classification?.description)}
                      </p>
                      <p>Доставка: {formatAddress(item?.deliveryAddress)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає даних по позиціях.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Учасники</h3>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {tenderers.length ? (
                  tenderers.map((tenderer, index) => (
                    <div key={`${tenderer?.identifier?.id ?? index}`}>
                      <p className="font-medium text-slate-900">
                        {formatValue(tenderer?.name || tenderer?.identifier?.legalName)}
                      </p>
                      <p>ЄДРПОУ: {formatValue(tenderer?.identifier?.id)}</p>
                      <p>{formatAddress(tenderer?.address)}</p>
                      <p>{formatContact(tenderer?.contactPoint)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає даних по учасниках.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Пропозиції</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {bids.length ? (
                  bids.map((bid, index) => (
                    <div key={`${bid?.id ?? index}`} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Статус:</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                            bid?.status,
                          )}`}
                        >
                          {formatStatus(bid?.status)}
                        </span>
                      </div>
                      <p>Дата: {formatDate(bid?.date)}</p>
                      <p>
                        Сума: {formatCurrency(bid?.value?.amount, bid?.value?.currency)}
                      </p>
                      <p>
                        Учасники: {Array.isArray(bid?.tenderers)
                          ? bid.tenderers
                              .map((tenderer: any) => tenderer?.name)
                              .filter(Boolean)
                              .join(", ")
                          : "—"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає пропозицій.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Нагороди</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {awards.length ? (
                  awards.map((award, index) => (
                    <div key={`${award?.id ?? index}`} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Статус:</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                            award?.status,
                          )}`}
                        >
                          {formatStatus(award?.status)}
                        </span>
                      </div>
                      <p>Дата: {formatDate(award?.date)}</p>
                      <p>
                        Сума: {formatCurrency(award?.value?.amount, award?.value?.currency)}
                      </p>
                      <p>
                        Постачальники: {Array.isArray(award?.suppliers)
                          ? award.suppliers
                              .map((supplier: any) => supplier?.name)
                              .filter(Boolean)
                              .join(", ")
                          : "—"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає нагород.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Контракти</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {contracts.length ? (
                  contracts.map((contract, index) => (
                    <div key={`${contract?.id ?? index}`} className="rounded-xl bg-slate-50 p-4">
                      <p>ID: {formatValue(contract?.contractID ?? contract?.id)}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Статус:</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                            contract?.status,
                          )}`}
                        >
                          {formatStatus(contract?.status)}
                        </span>
                      </div>
                      <p>Дата: {formatDate(contract?.date)}</p>
                      <p>
                        Сума: {formatCurrency(
                          contract?.value?.amount,
                          contract?.value?.currency,
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає контрактів.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Документи</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {documents.length ? (
                  documents.map((doc, index) => (
                    <div key={`${doc?.id ?? index}`} className="rounded-xl bg-slate-50 p-4">
                      <p className="font-medium text-slate-900">
                        {formatValue(doc?.title)}
                      </p>
                      <p>Тип: {formatValue(doc?.documentType)}</p>
                      <p>Формат: {formatValue(doc?.format)}</p>
                      <p>Дата: {formatDate(doc?.datePublished)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає документів.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Вимоги та критерії</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {criteria.length ? (
                  criteria.map((criterion, index) => (
                    <div key={`${criterion?.id ?? index}`} className="rounded-xl bg-slate-50 p-4">
                      <p className="font-medium text-slate-900">
                        {formatValue(criterion?.title)}
                      </p>
                      <p>{formatValue(criterion?.description)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає критеріїв.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Майлстоуни</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {milestones.length ? (
                  milestones.map((milestone, index) => (
                    <div key={`${milestone?.id ?? index}`} className="rounded-xl bg-slate-50 p-4">
                      <p className="font-medium text-slate-900">
                        {formatValue(milestone?.title)}
                      </p>
                      <p>{formatValue(milestone?.description)}</p>
                      <p>Відсоток: {formatValue(milestone?.percentage)}</p>
                      <p>
                        Тривалість: {formatValue(milestone?.duration?.days)}{" "}
                        {formatValue(milestone?.duration?.type)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Немає майлстоунів.</p>
                )}
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200 p-5">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Показати весь raw data
              </summary>
              <pre className="mt-4 max-h-[600px] overflow-auto rounded-2xl bg-slate-950/90 p-4 text-xs text-slate-100">
                {JSON.stringify(raw, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Raw data відсутні.</p>
        )}
      </div>
    </section>
  );
}
