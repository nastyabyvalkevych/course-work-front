"use client";

type Props = { filename: string; rows: Record<string, unknown>[]; label?: string };

/** Downloads the given rows as a UTF-8 CSV (with BOM, ; separator) that opens correctly in Excel. */
export default function CsvButton({ filename, rows, label = "Скачати CSV" }: Props) {
  const download = () => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
    const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={download}
      disabled={!rows.length}
      className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
    >
      {label}
    </button>
  );
}
