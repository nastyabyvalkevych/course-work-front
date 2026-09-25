import Link from "next/link";
import type { ReactNode } from "react";

/* Shared atoms used by every risk page. Keep them dumb: layout + tokens only. */

export function PageHeader({ eyebrow, title, lede, back, actions }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; back?: { href: string; label: string }; actions?: ReactNode }) {
  return (
    <header className="space-y-3">
      {back && <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">← {back.label}</Link>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
          {lede && <p className="text-base leading-relaxed text-muted">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "neutral" | "danger" | "warning" | "ok" | "accent" }) {
  const toneCls = {
    neutral: "bg-surface border-line",
    danger: "bg-danger-soft border-danger-line",
    warning: "bg-warning-soft border-warning-line",
    ok: "bg-ok-soft border-ok-line",
    accent: "bg-accent-soft border-line",
  }[tone];
  return (
    <div className={`rounded-2xl border p-5 ${toneCls}`}>
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-3 text-3xl font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs leading-snug text-muted">{sub}</p>}
    </div>
  );
}

export function Card({ title, hint, children, className = "", actions }: { title?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>}
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "danger" | "warning" | "ok" | "accent"; children: ReactNode; className?: string }) {
  const cls = {
    neutral: "bg-surface text-muted border-line",
    danger: "bg-danger-soft text-danger border-danger-line",
    warning: "bg-warning-soft text-warning border-warning-line",
    ok: "bg-ok-soft text-ok border-ok-line",
    accent: "bg-accent-soft text-accent-strong border-line",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls} ${className}`}>{children}</span>;
}

/** Big framed "the one thing to take away" block. */
export function Headline({ eyebrow = "Головне", children, sub }: { eyebrow?: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-ink bg-canvas p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{eyebrow}</p>
      <div className="mt-2 text-2xl font-extrabold leading-snug text-ink">{children}</div>
      {sub && <div className="mt-2 text-base text-muted">{sub}</div>}
    </section>
  );
}

/** Honest-reading notes at the bottom of a page. */
export function Notes({ title = "Як читати чесно", items }: { title?: string; items: ReactNode[] }) {
  return (
    <section className="rounded-2xl border border-line bg-canvas p-5 text-sm text-muted">
      <p className="font-semibold text-ink">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </section>
  );
}

export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="skeleton h-4" style={{ width: `${90 - (i % 3) * 18}%` }} />)}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-canvas p-8 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
    </div>
  );
}

export function Alert({ tone = "warning", children }: { tone?: "warning" | "danger" | "ok" | "accent"; children: ReactNode }) {
  const cls = { warning: "border-warning-line bg-warning-soft text-warning", danger: "border-danger-line bg-danger-soft text-danger", ok: "border-ok-line bg-ok-soft text-ok", accent: "border-line bg-accent-soft text-accent-strong" }[tone];
  return <div className={`rounded-xl border p-3 text-sm ${cls}`}>{children}</div>;
}
