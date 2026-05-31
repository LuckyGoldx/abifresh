'use client';

import { useState, useMemo } from 'react';

export interface UsePaginationOptions {
  totalItems: number;
  initialPage?: number;
  initialItemsPerPage?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToNextPage: () => void;
  goToPrevPage: () => void;
}

export function usePagination({
  totalItems,
  initialPage = 1,
  initialItemsPerPage = 10,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Reset to page 1 when itemsPerPage or totalItems changes
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const hasNextPage = safeCurrentPage < totalPages;
  const hasPrevPage = safeCurrentPage > 1;

  const goToNextPage = () => {
    if (hasNextPage) setCurrentPage(safeCurrentPage + 1);
  };

  const goToPrevPage = () => {
    if (hasPrevPage) setCurrentPage(safeCurrentPage - 1);
  };

  return {
    currentPage: safeCurrentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    setCurrentPage,
    setItemsPerPage,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
  };
}
