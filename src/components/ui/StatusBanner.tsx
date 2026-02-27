type BannerVariant = "loading" | "empty" | "error" | "info";

export function StatusBanner({
  variant,
  message,
  onRetry,
}: {
  variant: BannerVariant;
  message: string;
  onRetry?: () => void;
}) {
  const styles = {
    loading: "border-slate-200 bg-slate-50 text-slate-700",
    empty: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  }[variant];
  const icon = {
    loading: "⏳",
    empty: "🗂️",
    error: "⚠️",
    info: "ℹ️",
  }[variant];

  return (
    <div
      className={`mt-3 flex items-start justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${styles}`}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true">{icon}</span>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-ghost text-xs">
          Retry
        </button>
      )}
    </div>
  );
}

export type { BannerVariant };
