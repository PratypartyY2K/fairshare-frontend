import { StatusBanner } from "../../../components/ui/StatusBanner";

export function ApiStatusSection({
  loadingStatus,
  rootStatus,
  healthStatus,
  statusError,
  loadStatus,
}: {
  loadingStatus: boolean;
  rootStatus: string | null;
  healthStatus: string | null;
  statusError: string | null;
  loadStatus: () => void;
}) {
  return (
    <section className="panel fade-rise">
      <div className="flex items-center justify-between">
        <h2 className="section-title">API status</h2>
        <button
          onClick={loadStatus}
          className="btn btn-ghost text-sm"
          disabled={loadingStatus}
        >
          {loadingStatus ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
        <div>Root (/): {loadingStatus ? "Loading..." : rootStatus}</div>
        <div>Health (/health): {loadingStatus ? "Loading..." : healthStatus}</div>
      </div>
      {statusError && (
        <StatusBanner variant="error" message={statusError} onRetry={loadStatus} />
      )}
    </section>
  );
}
