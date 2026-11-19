"use client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

type BtnVariant = "primary" | "ghost" | "outline" | "danger" | "success";
export function Button({ variant = "primary", loading, className, children, ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  const v = {
    primary: "bg-brand hover:bg-brand2 text-white shadow-[0_0_0_1px_rgba(255,255,255,.06)_inset]",
    ghost: "hover:bg-white/5 text-ink",
    outline: "border border-line hover:border-brand/60 hover:bg-brand/10 text-ink",
    danger: "bg-bad/15 text-bad hover:bg-bad/25 border border-bad/30",
    success: "bg-ok/15 text-ok hover:bg-ok/25 border border-ok/30",
  }[variant];
  return (
    <button {...p} disabled={p.disabled || loading}
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3.5 h-9 text-sm font-medium transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none", v, className)}>
      {loading && <Loader2 className="size-4 animate-spin" />}{children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl bg-card border border-line/70 p-5 fade-in", className)}>{children}</div>;
}

export function CardTitle({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">{icon}{children}</h3>{right}
    </div>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "ok" | "warn" | "bad" | "brand" | "neutral"; children: ReactNode; className?: string }) {
  const t = {
    ok: "bg-ok/12 text-ok border-ok/25", warn: "bg-warn/12 text-warn border-warn/25", bad: "bg-bad/12 text-bad border-bad/25",
    brand: "bg-brand/15 text-brand2 border-brand/30", neutral: "bg-white/5 text-mute border-line",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", t, className)}>{children}</span>;
}

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cn("h-9 w-full rounded-lg bg-bg border border-line px-3 text-sm text-ink placeholder:text-mute/70 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition", className)} />
);

export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cn("h-9 rounded-lg bg-bg border border-line px-2.5 text-sm text-ink outline-none focus:border-brand", className)}>{children}</select>
);

export const Label = ({ children }: { children: ReactNode }) => <label className="text-xs text-mute font-medium">{children}</label>;

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} />;

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border border-dashed border-line">
      <div className="size-11 rounded-full bg-brand/12 grid place-items-center text-brand2 mb-3">{icon ?? <Inbox className="size-5" />}</div>
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="text-sm text-mute mt-1 max-w-md">{children}</div>}
    </div>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 text-bad p-3 text-sm">
      <AlertTriangle className="size-4 mt-0.5 shrink-0" /><span>{error}</span>
    </div>
  );
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: "brand" | "warn" | "ok" }) {
  const c = { brand: "bg-brand", warn: "bg-warn", ok: "bg-ok" }[tone];
  return (
    <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", c)} style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-mute mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap gap-2">{right}</div>}
    </div>
  );
}

export function Stat({ label, value, icon, tone, hint }: { label: string; value: ReactNode; icon: ReactNode; tone?: "ok" | "warn" | "bad" | "brand"; hint?: string }) {
  const t = { ok: "text-ok bg-ok/12", warn: "text-warn bg-warn/12", bad: "text-bad bg-bad/12", brand: "text-brand2 bg-brand/15" }[tone ?? "brand"];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-mute">{label}</span>
        <span className={cn("size-8 rounded-lg grid place-items-center", t)}>{icon}</span>
      </div>
      <div className="text-2xl font-semibold mt-2 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-mute mt-0.5">{hint}</div>}
    </Card>
  );
}

const STATE_TONE: Record<string, "ok" | "warn" | "bad" | "brand" | "neutral"> = {
  READY: "ok", SENT: "ok", RENDERING: "warn", ANALYZED: "brand", CANDIDATE: "warn", VALIDATED: "warn",
  FAILED: "bad", REJECTED: "neutral", DISCOVERED: "neutral",
};
export const StateBadge = ({ state, label }: { state: string; label: string }) => <Badge tone={STATE_TONE[state] ?? "neutral"}>{label}</Badge>;

export function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <Badge>Non noté</Badge>;
  const tone = score >= 80 ? "ok" : score >= 65 ? "warn" : "neutral";
  return <Badge tone={tone}><span className="tabular-nums">{Math.round(score)}</span>/100</Badge>;
}

export const RIGHTS_FR: Record<string, string> = {
  discovered: "Non autorisé (repérage)", authorized: "Autorisé par le créateur", owned: "Contenu personnel",
};
