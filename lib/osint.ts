type RawBid = {
  value?: { amount?: number | null; currency?: string | null } | null;
  lotValues?: Array<{ value?: { amount?: number | null; currency?: string | null } | null }> | null;
  tenderers?: Array<{
    name?: string | null;
    identifier?: { id?: string | null } | null;
  }> | null;
};

export type OsintBadge = {
  id: string;
  label: string;
  description: string;
  tone: "danger" | "warning" | "info";
};

const PRICE_CLUSTER_THRESHOLD_PCT = 1;
const PRICE_CLUSTER_MIN_AMOUNT = 10_000;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asBids = (rawData: unknown): RawBid[] => {
  const raw = asRecord(rawData);
  const bids = raw?.bids;
  return Array.isArray(bids) ? (bids as RawBid[]) : [];
};

const extractBidAmount = (bid: RawBid): number | null => {
  const directAmount = bid.value?.amount;
  if (typeof directAmount === "number" && Number.isFinite(directAmount) && directAmount > 0) {
    return directAmount;
  }

  const lotAmount = bid.lotValues?.find(
    (lot) => typeof lot?.value?.amount === "number" && Number.isFinite(lot.value.amount) && lot.value.amount > 0,
  )?.value?.amount;

  return typeof lotAmount === "number" ? lotAmount : null;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 2,
  }).format(value);

const formatPct = (value: number) =>
  new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 3,
  }).format(value);

export const getOsintBadges = (rawData: unknown): OsintBadge[] => {
  const bids = asBids(rawData);
  const amounts = bids
    .map(extractBidAmount)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);

  const participantIds = new Set<string>();
  for (const bid of bids) {
    for (const tenderer of bid.tenderers ?? []) {
      const id = tenderer?.identifier?.id?.trim();
      const fallbackName = tenderer?.name?.trim();
      if (id) {
        participantIds.add(id);
      } else if (fallbackName) {
        participantIds.add(`name:${fallbackName}`);
      }
    }
  }

  const badges: OsintBadge[] = [];

  if (participantIds.size === 1 && bids.length >= 1) {
    badges.push({
      id: "single-bidder",
      label: "Single Bidder",
      description: "У закупівлі зафіксовано лише одного учасника.",
      tone: "warning",
    });
  }

  if (amounts.length >= 2) {
    const minAmount = amounts[0];
    const maxAmount = amounts[amounts.length - 1];
    const spreadPct = maxAmount > 0 ? ((maxAmount - minAmount) / maxAmount) * 100 : 0;
    const diff = maxAmount - minAmount;

    if (minAmount >= PRICE_CLUSTER_MIN_AMOUNT && spreadPct < PRICE_CLUSTER_THRESHOLD_PCT) {
      const label =
        diff === 0
          ? "Identical Bids"
          : diff <= 1
            ? "Price Clustering · 1 грн"
            : "Price Clustering";

      badges.push({
        id: "price-clustering",
        label,
        description: `Пропозиції дуже близькі: ${formatMoney(minAmount)}–${formatMoney(maxAmount)} грн, spread ${formatPct(spreadPct)}%.`,
        tone: "danger",
      });
    }
  }

  return badges;
};

export const osintBadgeClass = (tone: OsintBadge["tone"]) => {
  switch (tone) {
    case "danger":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-sky-200 bg-sky-50 text-sky-800";
  }
};
