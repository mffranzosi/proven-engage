"use client";

import { Children, useState } from "react";

/**
 * Shows large lists 50-at-a-time without breaking the surrounding <form> —
 * every item stays mounted (just visually hidden via the `hidden` attribute),
 * so checkbox/radio values on other pages still submit with the form.
 */
export function PaginatedList({
  children,
  pageSize = 50,
  itemSpacing = "space-y-1",
}: {
  children: React.ReactNode;
  pageSize?: number;
  itemSpacing?: string;
}) {
  const items = Children.toArray(children);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);

  return (
    <div>
      <ul className={itemSpacing}>
        {items.map((item, i) => (
          <li key={i} hidden={i < page * pageSize || i >= (page + 1) * pageSize}>
            {item}
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-neutral-300 px-2 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {totalPages} ({items.length} total)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded-md border border-neutral-300 px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
