import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 75, 100];

const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
  if (totalItems === 0) return null;

  const totalPages = Math.ceil(totalItems / pageSize);
  const safePage = Math.min(currentPage, totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers to display with ellipsis for large ranges
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, safePage - 2);
      let end = Math.min(totalPages - 1, safePage + 2);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-t border-outline-variant gap-3">
      <div className="flex items-center gap-2">
        <span className="font-caption text-on-surface-variant whitespace-nowrap">Rows per page:</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-3 py-1.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all appearance-none pr-8 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-caption text-on-surface-variant whitespace-nowrap">
          Showing {startItem}–{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-on-surface-variant" />
          </button>
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1 font-body-md text-on-surface-variant select-none">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-lg font-body-md transition-all ${
                  safePage === page
                    ? 'bg-secondary text-white shadow-sm'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                {page}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
