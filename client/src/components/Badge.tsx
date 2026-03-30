import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneMap = {
  sev1: "bg-red-500/15 text-red-300 ring-red-500/30",
  sev2: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  sev3: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  sev4: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  open: "bg-slate-500/15 text-slate-200 ring-slate-500/30",
  investigating: "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30",
  mitigated: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  resolved: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  overdue: "bg-red-500/15 text-red-200 ring-red-500/30",
  healthy: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
} as const;

export function Badge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof toneMap;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.22em] ring-1 ring-inset",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
