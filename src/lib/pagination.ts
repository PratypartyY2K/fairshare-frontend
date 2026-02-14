export type PaginationMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export type PaginatedResponse<
  TItem,
  TItemsKey extends string = "items",
> = PaginationMeta & {
  [K in TItemsKey]: TItem[];
};
