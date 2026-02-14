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
    <div className="mt-6 rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">API status</h2>
        <button
          onClick={loadStatus}
          className="text-sm underline"
          disabled={loadingStatus}
        >
          {loadingStatus ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="mt-3 space-y-2 text-sm text-gray-600">
        <div>Root (/): {loadingStatus ? "Loading..." : rootStatus}</div>
        <div>Health (/health): {loadingStatus ? "Loading..." : healthStatus}</div>
      </div>
      {statusError && (
        <StatusBanner variant="error" message={statusError} onRetry={loadStatus} />
      )}
    </div>
  );
}
