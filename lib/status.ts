const STATUS_LABELS: Record<string, string> = {
  active: "Активний",
  complete: "Завершений",
  cancelled: "Скасований",
  unsuccessful: "Неуспішний",
  pending: "Очікується",
  draft: "Чернетка",
  terminated: "Припинено",
  "active.enquiries": "Активний: уточнення",
  "active.tendering": "Активний: прийом пропозицій",
  "active.pre-qualification": "Активний: прекваліфікація",
  "active.qualification": "Активний: кваліфікація",
  "active.auction": "Активний: аукціон",
  "active.awarded": "Активний: нагородження",
  "active.contracting": "Активний: укладання договору",
  "active.signed": "Активний: підписано",
  "complete.early": "Завершено достроково",
  "cancelled.qualification": "Скасовано: кваліфікація",
  "cancelled.tendering": "Скасовано: прийом пропозицій",
  "unsuccessful.tendering": "Неуспішно: прийом пропозицій",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  complete: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  unsuccessful: "bg-orange-100 text-orange-700",
  pending: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  terminated: "bg-rose-100 text-rose-700",
  "active.enquiries": "bg-blue-100 text-blue-700",
  "active.tendering": "bg-blue-100 text-blue-700",
  "active.pre-qualification": "bg-blue-100 text-blue-700",
  "active.qualification": "bg-blue-100 text-blue-700",
  "active.auction": "bg-indigo-100 text-indigo-700",
  "active.awarded": "bg-indigo-100 text-indigo-700",
  "active.contracting": "bg-indigo-100 text-indigo-700",
  "active.signed": "bg-indigo-100 text-indigo-700",
  "complete.early": "bg-emerald-100 text-emerald-700",
  "cancelled.qualification": "bg-rose-100 text-rose-700",
  "cancelled.tendering": "bg-rose-100 text-rose-700",
  "unsuccessful.tendering": "bg-orange-100 text-orange-700",
};

export const formatStatus = (status?: string | null) => {
  if (!status) {
    return "—";
  }
  return STATUS_LABELS[status] ?? status;
};

export const statusBadgeClass = (status?: string | null) => {
  if (!status) {
    return "bg-slate-100 text-slate-600";
  }
  return STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";
};
