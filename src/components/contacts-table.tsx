"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NotionContact, NotionCompany } from "@/lib/notion";

type SortKey = "name" | "company" | "email" | "phone" | "businessStatus";
type SortDir = "asc" | "desc";

export function ContactsTable({
  contacts,
  companies,
}: {
  contacts: NotionContact[];
  companies: NotionCompany[];
}) {
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const [filters, setFilters] = useState({ name: "", company: "", email: "", phone: "", businessStatus: "" });
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

  function fieldValue(c: NotionContact, key: SortKey): string {
    switch (key) {
      case "name":
        return c.name;
      case "company":
        return (c.companyId && companyById.get(c.companyId)?.name) || "";
      case "email":
        return c.email ?? "";
      case "phone":
        return c.phone ?? "";
      case "businessStatus":
        return c.businessStatus ?? "";
    }
  }

  const rows = useMemo(() => {
    const filtered = contacts.filter(
      (c) =>
        fieldValue(c, "name").toLowerCase().includes(filters.name.toLowerCase()) &&
        fieldValue(c, "company").toLowerCase().includes(filters.company.toLowerCase()) &&
        fieldValue(c, "email").toLowerCase().includes(filters.email.toLowerCase()) &&
        fieldValue(c, "phone").toLowerCase().includes(filters.phone.toLowerCase()) &&
        fieldValue(c, "businessStatus").toLowerCase().includes(filters.businessStatus.toLowerCase()),
    );
    const sorted = [...filtered].sort((a, b) => {
      const cmp = fieldValue(a, sortKey).localeCompare(fieldValue(b, sortKey));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, companyById, filters, sortKey, sortDir]);

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "company", label: "Company" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "businessStatus", label: "Business status" },
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
            {columns.map((col) => (
              <th key={col.key} className="px-4 pb-2 font-normal">
                <input
                  value={filters[col.key]}
                  onChange={(e) => setFilter(col.key, e.target.value)}
                  placeholder="Filter…"
                  className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const company = c.companyId ? companyById.get(c.companyId) : undefined;
            return (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {company ? (
                    <Link href={`/companies/${company.id}`} className="hover:underline">
                      {company.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-600">{c.email ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-600">{c.phone ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-600">{c.businessStatus ?? "—"}</td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-neutral-500">
                No contacts match these filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
