"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NotionCompany } from "@/lib/notion";

type SortKey = "name" | "segment" | "contacts";
type SortDir = "asc" | "desc";

export function CompaniesTable({
  companies,
  contactCountByCompany,
}: {
  companies: NotionCompany[];
  contactCountByCompany: Map<string, number>;
}) {
  const [filters, setFilters] = useState({ name: "", segment: "" });
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    const filtered = companies.filter(
      (c) =>
        c.name.toLowerCase().includes(filters.name.toLowerCase()) &&
        c.segment.join(", ").toLowerCase().includes(filters.segment.toLowerCase()),
    );
    const sorted = [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "segment") cmp = a.segment.join(", ").localeCompare(b.segment.join(", "));
      else cmp = (contactCountByCompany.get(a.id) ?? 0) - (contactCountByCompany.get(b.id) ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [companies, filters, sortKey, sortDir, contactCountByCompany]);

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "segment", label: "Segment" },
    { key: "contacts", label: "Contacts" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="flex items-center gap-1 hover:text-neutral-900"
                >
                  {col.label}
                  {sortKey === col.key ? <span>{sortDir === "asc" ? "▲" : "▼"}</span> : null}
                </button>
              </th>
            ))}
          </tr>
          <tr>
            <th className="px-4 pb-2 font-normal">
              <input
                value={filters.name}
                onChange={(e) => setFilter("name", e.target.value)}
                placeholder="Filter…"
                className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs"
              />
            </th>
            <th className="px-4 pb-2 font-normal">
              <input
                value={filters.segment}
                onChange={(e) => setFilter("segment", e.target.value)}
                placeholder="Filter…"
                className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs"
              />
            </th>
            <th className="px-4 pb-2 font-normal" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-4 py-2">
                <Link href={`/companies/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-neutral-600">{c.segment.join(", ") || "—"}</td>
              <td className="px-4 py-2 text-neutral-600">{contactCountByCompany.get(c.id) ?? 0}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-neutral-500">
                No companies match these filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
