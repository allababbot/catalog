/** Page numbers a pager can render, with ellipses where a gap is elided. */
export type PageToken = number | "ellipsis-start" | "ellipsis-end";

/** How many rows make up one page. */
export function pageCount(totalRows: number, pageSize: number): number {
    return Math.max(1, Math.ceil(totalRows / pageSize));
}

/**
 * The tokens for the pager: first page, a window around the current page,
 * and last page, with ellipses where pages are skipped.
 */
export function pageWindow(currentPage: number, totalPages: number, windowSize: number): PageToken[] {
    if (totalPages <= 1) return [1];

    const pages: PageToken[] = [1];
    const startPage = Math.max(2, currentPage - windowSize);
    const endPage = Math.min(totalPages - 1, currentPage + windowSize);

    if (startPage > 2) pages.push("ellipsis-start");
    for (let page = startPage; page <= endPage; page += 1) pages.push(page);
    if (endPage < totalPages - 1) pages.push("ellipsis-end");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
}