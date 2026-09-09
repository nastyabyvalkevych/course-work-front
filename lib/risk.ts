export const riskTone = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "neutral" as const;
  if (score >= 0.7) return "danger" as const;
  if (score >= 0.45) return "warning" as const;
  return "ok" as const;
};

export const riskLabel = (score: number | null | undefined) => {
  const tone = riskTone(score);
  if (tone === "danger") return "Високий";
  if (tone === "warning") return "Підвищений";
  if (tone === "ok") return "Низький";
  return "Немає даних";
};

export const riskBadgeClass = (score: number | null | undefined) => {
  const tone = riskTone(score);
  if (tone === "danger") return "bg-red-100 text-red-800 border-red-200";
  if (tone === "warning") return "bg-amber-100 text-amber-800 border-amber-200";
  if (tone === "ok") return "bg-green-100 text-green-800 border-green-200";
  return "bg-surface text-muted border-line";
};

export const riskBarColor = (score: number | null | undefined) => {
  const tone = riskTone(score);
  if (tone === "danger") return "#dc2626";
  if (tone === "warning") return "#d97706";
  if (tone === "ok") return "#16a34a";
  return "#9ca3af";
};

export const pct = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)} %`;

export const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : new Intl.NumberFormat("uk-UA").format(v);

export const money = (v: number | null | undefined, cur?: string | null) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: cur || "UAH",
        maximumFractionDigits: 0,
      }).format(v);

export const date = (v: string | null | undefined) =>
  v ? new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(new Date(v)) : "—";
