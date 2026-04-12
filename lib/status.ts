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
  active: "bg-[#f8e71c] text-black",
  complete: "bg-white text-black",
  cancelled: "bg-[#222222] text-[#ff9b9b]",
  unsuccessful: "bg-[#222222] text-[#f8e71c]",
  pending: "bg-[#222222] text-[#f0ddb2]",
  draft: "bg-[#1a1a1a] text-[#96968c]",
  terminated: "bg-[#222222] text-[#ff9b9b]",
  "active.enquiries": "bg-[#f8e71c] text-black",
  "active.tendering": "bg-[#f8e71c] text-black",
  "active.pre-qualification": "bg-[#f8e71c] text-black",
  "active.qualification": "bg-[#f8e71c] text-black",
  "active.auction": "bg-[#f8e71c] text-black",
  "active.awarded": "bg-white text-black",
  "active.contracting": "bg-white text-black",
  "active.signed": "bg-white text-black",
  "complete.early": "bg-white text-black",
  "cancelled.qualification": "bg-[#222222] text-[#ff9b9b]",
  "cancelled.tendering": "bg-[#222222] text-[#ff9b9b]",
  "unsuccessful.tendering": "bg-[#222222] text-[#f8e71c]",
};

export const formatStatus = (status?: string | null) => {
  if (!status) {
    return "—";
  }
  return STATUS_LABELS[status] ?? status;
};

export const statusBadgeClass = (status?: string | null) => {
  if (!status) {
    return "bg-[#1a1a1a] text-[#96968c]";
  }
  return STATUS_COLORS[status] ?? "bg-[#1a1a1a] text-[#96968c]";
};
