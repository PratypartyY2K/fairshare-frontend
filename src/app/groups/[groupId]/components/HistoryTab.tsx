import { PaginationControls } from "../../../../components/ui/PaginationControls";
import { StatusBanner } from "../../../../components/ui/StatusBanner";
import { formatEventPayload, getShortTimeZoneLabel } from "../groupPageUtils";
import type { ConfirmedTransfer, EventResponse, Member } from "../types";

export function HistoryTab({
  sectionClass,
  groupId,
  members,
  getMemberName,
  confirmedTransfers,
  confirmedTransfersSort,
  confirmedTransfersPage,
  confirmedTransfersPageSize,
  confirmedTransfersTotalPages,
  confirmedTransfersTotalItems,
  loadingConfirmedTransfers,
  confirmedTransfersError,
  confirmedFilter,
  events,
  eventsSort,
  eventsPage,
  eventsPageSize,
  eventsTotalPages,
  eventsTotalItems,
  loadingEvents,
  eventsError,
  memberNameById,
  setConfirmedTransfersSort,
  loadConfirmedTransfers,
  setConfirmedFilter,
  setConfirmedTransfersPageSize,
  setEventsSort,
  loadEvents,
  setEventsPageSize,
}: {
  sectionClass: string;
  groupId: number;
  members: Member[];
  getMemberName: (member: Member) => string;
  confirmedTransfers: ConfirmedTransfer[];
  confirmedTransfersSort: string;
  confirmedTransfersPage: number;
  confirmedTransfersPageSize: number;
  confirmedTransfersTotalPages: number;
  confirmedTransfersTotalItems: number;
  loadingConfirmedTransfers: boolean;
  confirmedTransfersError: string | null;
  confirmedFilter: string;
  events: EventResponse[];
  eventsSort: string;
  eventsPage: number;
  eventsPageSize: number;
  eventsTotalPages: number;
  eventsTotalItems: number;
  loadingEvents: boolean;
  eventsError: string | null;
  memberNameById: Map<number, string>;
  setConfirmedTransfersSort: (value: string) => void;
  loadConfirmedTransfers: (gid: number, page?: number, pageSize?: number, sort?: string) => Promise<void>;
  setConfirmedFilter: (value: string) => void;
  setConfirmedTransfersPageSize: (size: number) => void;
  setEventsSort: (value: string) => void;
  loadEvents: (gid: number, page?: number, pageSize?: number, sort?: string) => Promise<void>;
  setEventsPageSize: (size: number) => void;
}) {
  return (
    <>
      <div className={sectionClass}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Confirmed transfers
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <span>Date</span>
              <button
                className={`rounded border px-1 leading-none ${confirmedTransfersSort === "createdAt,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setConfirmedTransfersSort("createdAt,asc");
                  if (Number.isFinite(groupId)) {
                    void loadConfirmedTransfers(groupId, 1, confirmedTransfersPageSize, "createdAt,asc");
                  }
                }}
                disabled={loadingConfirmedTransfers}
                aria-label="Sort confirmed transfers by date ascending"
              >
                ▲
              </button>
              <button
                className={`rounded border px-1 leading-none ${confirmedTransfersSort === "createdAt,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setConfirmedTransfersSort("createdAt,desc");
                  if (Number.isFinite(groupId)) {
                    void loadConfirmedTransfers(groupId, 1, confirmedTransfersPageSize, "createdAt,desc");
                  }
                }}
                disabled={loadingConfirmedTransfers}
                aria-label="Sort confirmed transfers by date descending"
              >
                ▼
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span>Amount</span>
              <button
                className={`rounded border px-1 leading-none ${confirmedTransfersSort === "amount,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setConfirmedTransfersSort("amount,asc");
                  if (Number.isFinite(groupId)) {
                    void loadConfirmedTransfers(groupId, 1, confirmedTransfersPageSize, "amount,asc");
                  }
                }}
                disabled={loadingConfirmedTransfers}
                aria-label="Sort confirmed transfers by amount ascending"
              >
                ▲
              </button>
              <button
                className={`rounded border px-1 leading-none ${confirmedTransfersSort === "amount,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setConfirmedTransfersSort("amount,desc");
                  if (Number.isFinite(groupId)) {
                    void loadConfirmedTransfers(groupId, 1, confirmedTransfersPageSize, "amount,desc");
                  }
                }}
                disabled={loadingConfirmedTransfers}
                aria-label="Sort confirmed transfers by amount descending"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        <input
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          placeholder="Filter by confirmation ID (optional)"
          value={confirmedFilter}
          onChange={(e) => setConfirmedFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && Number.isFinite(groupId)) {
              void loadConfirmedTransfers(groupId, 1);
            }
          }}
        />

        {loadingConfirmedTransfers && (
          <StatusBanner variant="loading" message="Loading confirmed transfers..." />
        )}
        {confirmedTransfersError && (
          <StatusBanner
            variant="error"
            message={confirmedTransfersError}
            onRetry={() =>
              Number.isFinite(groupId) &&
              loadConfirmedTransfers(groupId, confirmedTransfersPage)
            }
          />
        )}
        {!loadingConfirmedTransfers && !confirmedTransfersError && confirmedTransfers.length === 0 && (
          <StatusBanner variant="empty" message="No confirmed transfers yet." />
        )}
        {!loadingConfirmedTransfers && !confirmedTransfersError && confirmedTransfers.length > 0 && (
          <div className="mt-4 space-y-2">
            {confirmedTransfers.map((transfer) => {
              const fromMember = members.find((m) => m.id === transfer.fromUserId);
              const toMember = members.find((m) => m.id === transfer.toUserId);
              const fromLabel = fromMember ? getMemberName(fromMember) : `User #${transfer.fromUserId}`;
              const toLabel = toMember ? getMemberName(toMember) : `User #${transfer.toUserId}`;
              return (
                <div
                  key={transfer.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <div className="text-sm font-medium text-slate-900">
                    {fromLabel} → {toLabel}: ${Number(transfer.amount).toFixed(2)}
                  </div>
                  <div className="mt-1">
                    Confirmation: {transfer.confirmationId ?? "—"} · {new Date(transfer.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loadingConfirmedTransfers && !confirmedTransfersError && confirmedTransfersTotalItems > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {confirmedTransfersPage} of {confirmedTransfersTotalPages} ({confirmedTransfersTotalItems} transfers)
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <span>Page size</span>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1"
                  value={confirmedTransfersPageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setConfirmedTransfersPageSize(nextSize);
                    if (Number.isFinite(groupId)) {
                      void loadConfirmedTransfers(groupId, 1, nextSize);
                    }
                  }}
                  disabled={loadingConfirmedTransfers}
                >
                  {[5, 10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <PaginationControls
                currentPage={confirmedTransfersPage}
                totalPages={confirmedTransfersTotalPages}
                loading={loadingConfirmedTransfers}
                className="mt-3 flex items-center justify-end gap-2 text-xs"
                onPageChange={(page) => Number.isFinite(groupId) && void loadConfirmedTransfers(groupId, page)}
              />
            </div>
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Expense events
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <span>Date</span>
              <button
                className={`rounded border px-1 leading-none ${eventsSort === "createdAt,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setEventsSort("createdAt,asc");
                  if (Number.isFinite(groupId)) {
                    void loadEvents(groupId, 1, eventsPageSize, "createdAt,asc");
                  }
                }}
                disabled={loadingEvents}
                aria-label="Sort events by date ascending"
              >
                ▲
              </button>
              <button
                className={`rounded border px-1 leading-none ${eventsSort === "createdAt,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setEventsSort("createdAt,desc");
                  if (Number.isFinite(groupId)) {
                    void loadEvents(groupId, 1, eventsPageSize, "createdAt,desc");
                  }
                }}
                disabled={loadingEvents}
                aria-label="Sort events by date descending"
              >
                ▼
              </button>
            </div>
            <button
              className="text-xs font-medium text-slate-600 underline"
              onClick={() => Number.isFinite(groupId) && loadEvents(groupId, eventsPage)}
              disabled={loadingEvents}
            >
              {loadingEvents ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loadingEvents && <StatusBanner variant="loading" message="Loading events..." />}
        {eventsError && (
          <StatusBanner
            variant="error"
            message={eventsError}
            onRetry={() => Number.isFinite(groupId) && loadEvents(groupId, eventsPage)}
          />
        )}
        {!loadingEvents && !eventsError && events.length === 0 && (
          <StatusBanner variant="empty" message="No events yet." />
        )}
        {!loadingEvents && !eventsError && events.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.eventId}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <div className="text-sm font-medium text-slate-900">{event.eventType}</div>
                  <div className="mt-1">
                    {new Date(event.createdAt).toLocaleString()} ({getShortTimeZoneLabel(event.createdAt)})
                  </div>
                  <div className="mt-2 whitespace-pre-wrap break-words text-[11px] text-slate-500">
                    {formatEventPayload(event.payload, memberNameById)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!loadingEvents && !eventsError && eventsTotalItems > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {eventsPage} of {eventsTotalPages} ({eventsTotalItems} events)
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <span>Page size</span>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1"
                  value={eventsPageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setEventsPageSize(nextSize);
                    if (Number.isFinite(groupId)) {
                      void loadEvents(groupId, 1, nextSize);
                    }
                  }}
                  disabled={loadingEvents}
                >
                  {[5, 10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <PaginationControls
                currentPage={eventsPage}
                totalPages={eventsTotalPages}
                loading={loadingEvents}
                className="mt-3 flex items-center justify-end gap-2 text-xs"
                onPageChange={(page) => Number.isFinite(groupId) && void loadEvents(groupId, page)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
