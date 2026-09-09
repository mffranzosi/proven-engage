"use client";

import { useMemo, useState } from "react";
import type { NotionContact, NotionCompany } from "@/lib/notion";

export function ContactPicker({
  contacts,
  companies,
  formAction,
}: {
  contacts: NotionContact[];
  companies: NotionCompany[];
  formAction: (formData: FormData) => void;
}) {
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const segmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) for (const s of c.segment) set.add(s);
    return [...set].sort();
  }, [companies]);

  const [segment, setSegment] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const company = c.companyId ? companyById.get(c.companyId) : undefined;
      if (segment && !(company?.segment ?? []).includes(segment)) return false;
      if (companyFilter && !(company?.name ?? "").toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (statusFilter && !(c.businessStatus ?? "").toLowerCase().includes(statusFilter.toLowerCase())) return false;
      return true;
    });
  }, [contacts, companyById, segment, companyFilter, statusFilter]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <select value={segment} onChange={(e) => setSegment(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs">
          <option value="">All segments</option>
          {segmentOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          placeholder="Filter by company…"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        />
        <input
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Filter by pipeline status…"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        />
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-neutral-300 p-3">
        {filtered.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="contactIds" value={c.id} />
            {c.name}{" "}
            <span className="text-neutral-400">
              ({c.companyId ? companyById.get(c.companyId)?.name ?? "" : "no company"})
            </span>
          </label>
        ))}
        {filtered.length === 0 ? <p className="text-sm text-neutral-500">No contacts match these filters.</p> : null}
      </div>
      <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
        Add selected
      </button>
    </form>
  );
}
