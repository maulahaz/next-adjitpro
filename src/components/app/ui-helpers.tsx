import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "positive" | "negative" | "muted";
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-bold sm:text-xl",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

const STATUS_TONE: Record<string, { className: string; label?: string }> = {
  Draft: { className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  Komplit: { className: "bg-sky-500 text-white" },
  Release: { className: "bg-teal-600 text-white" },
  Berjalan: { className: "bg-blue-600 text-white" },
  Selesai: { className: "bg-emerald-600 text-white" },
  Ditutup: { className: "bg-violet-600 text-white" },
  Aktif: { className: "bg-emerald-600 text-white" },
  Nonaktif: { className: "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  Dibebaskan: { className: "bg-amber-500 text-white" },
  Lunas: { className: "bg-emerald-700 text-white" },
  Dibatalkan: { className: "bg-rose-600 text-white" },
  Dikembalikan: { className: "bg-amber-500 text-white" },
  Setor: { className: "bg-emerald-600 text-white" },
  Tarik: { className: "bg-rose-600 text-white" },
  Pendapatan: { className: "bg-emerald-600 text-white" },
  Biaya: { className: "bg-rose-600 text-white" },
  Debet: { className: "bg-emerald-600 text-white" },
  Kredit: { className: "bg-rose-600 text-white" },
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? { className: "bg-secondary text-secondary-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone.className,
      )}
    >
      {status}
    </span>
  );
}
