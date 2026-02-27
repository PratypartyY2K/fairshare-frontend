function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function PaginationControls({
  currentPage,
  totalPages,
  loading,
  onPageChange,
  className,
}: {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className={className ?? "flex items-center gap-2"}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={loading || currentPage <= 1}
        className="btn btn-ghost py-1 disabled:opacity-50"
      >
        Previous
      </button>
      {visiblePages.map((page, index) => {
        const showLeftGap = index > 0 && visiblePages[index - 1] < page - 1;
        return (
          <span key={`page-${page}`} className="flex items-center gap-2">
            {showLeftGap && <span className="text-gray-400">…</span>}
            <button
              onClick={() => onPageChange(page)}
              disabled={loading}
              className={`btn py-1 disabled:opacity-50 ${page === currentPage ? "btn-primary" : "btn-ghost"}`}
            >
              {page}
            </button>
          </span>
        );
      })}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading || currentPage >= totalPages}
        className="btn btn-ghost py-1 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
