export interface Pagination {
    /**
     * The current (active) page.
     */
    currentPage: number;

    /**
     * The number of items per paginated page.
     */
    pageSize?: number;

    /**
     * The total number of items in the collection.
     */
    totalItems?: number;
}