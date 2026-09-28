"use client";

import { useMemo, useState } from "react";
import type { NotionContact, NotionCompany } from "@/lib/notion";

export type ContactHistoryEntry = { campaign: string; sent: boolean };

export function CampaignContactSelector({
  contacts,
  companies,
  lists,
  history,
}: {
  contacts: NotionContact[];
  companies: NotionCompany[];
  lists: { id: string; name: string; memberIds: string[] }[];
  history: Record<string, ContactHistoryEntry[]>;
}) {
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const segmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) for (const s of c.segment) set.add(s);
    return [...set].sort();
  }, [companies]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [segment, setSegment] = useState("");
  const [search, setSearch] = useState("");
  const [emailKnown, setEmailKnown] = useState<"any" | "yes" | "no">("yes");
  const [contacted, setContacted] = useState<"any" | "yes" | "no">("any");

  const hasBeenSent = (id: string) => (history[id] ?? []).some((h) => h.sent);

  const shown = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const company = c.companyId ? companyById.get(c.companyId) : undefined;
      if (segment && !(company?.segment ?? []).includes(segment)) return false;
      if (emailKnown === "yes" && !c.email) return false;
      if (emailKnown === "no" && c.email) return false;
      if (contacted === "yes" && !hasBeenSent(c.id)) return false;
      if (contacted === "no" && hasBeenSent(c.id)) return false;
      if (q && !`${c.name} ${company?.name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, companyById, segment, search, contacted, emailKnown, history]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addList(listId: string) {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of list.memberIds) if (contactById.has(id)) next.add(id);
      return next;
    });
  }

  function selectAllShown() {
    setSelected((prev) => new Set([...prev, ...shown.map((c) => c.id)]));
  }

  const selectedContacts = [...selected].map((id) => contactById.get(id)).filter((c): c is NotionContact => Boolean(c));
  const selectedNoEmail = selectedContacts.filter((c) => !c.email).length;
  const selectedContacted = selectedContacts.filter((c) => hasBeenSent(c.id)).length;

  function HistoryBadge({ id }: { id: string }) {
    const entries = history[id] ?? [];
    if (entries.length === 0) return null;
    const anySent = entries.some((h) => h.sent);
    return (
      <span
        className={`rounded px-1.5 py-0.5 text-[11px] ${anySent ? "bg-proven-coral/10 text-proven-coral" : "bg-neutral-100 text-neutral-500"}`}
      >
        {anySent ? "Already emailed" : "In draft"}: {entries.map((h) => h.campaign).join(", ")}
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="contactIds" value={id} />
      ))}

      <div className="grid grid-cols-3 gap-2">
        <select
          value=""
          onChange={(e) => addList(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        >
          <option value="">Add a list…</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.memberIds.length})
            </option>
          ))}
        </select>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        >
          <option value="">All segments</option>
          {segmentOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or company…"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
        <label className="flex items-center gap-1.5">
          Email known?
          <select
            value={emailKnown}
            onChange={(e) => setEmailKnown(e.target.value as "any" | "yes" | "no")}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="any">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          Already contacted in past campaigns?
          <select
            value={contacted}
            onChange={(e) => setContacted(e.target.value as "any" | "yes" | "no")}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="any">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <button type="button" onClick={selectAllShown} className="font-medium text-neutral-900 hover:underline">
          Select all {shown.length} shown
        </button>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-neutral-300 p-3">
        {shown.map((c) => {
          const company = c.companyId ? companyById.get(c.companyId) : undefined;
          return (
            <label key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              {c.name}
              <span className="text-neutral-400">
                ({company?.name ?? "no company"}
                {company?.segment.length ? ` · ${company.segment.join(", ")}` : ""})
              </span>
              <HistoryBadge id={c.id} />
            </label>
          );
        })}
        {shown.length === 0 ? <p className="text-sm text-neutral-500">No contacts match these filters.</p> : null}
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-900">Recipients to confirm ({selected.size})</p>
          {selected.size > 0 ? (
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-neutral-500 hover:underline">
              Clear all
            </button>
          ) : null}
        </div>
        {selectedNoEmail > 0 ? (
          <p className="mb-2 text-xs text-proven-coral">{selectedNoEmail} selected have no email and would bounce.</p>
        ) : null}
        {selectedContacted > 0 ? (
          <p className="mb-2 text-xs text-proven-coral">
            {selectedContacted} selected have already been emailed in an earlier campaign.
          </p>
        ) : null}
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {selectedContacts.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-label={`Remove ${c.name}`}
                className="text-neutral-400 hover:text-proven-coral"
              >
                ✕
              </button>
              {c.name}
              <span className="text-neutral-400">{c.email ?? "no email"}</span>
              <HistoryBadge id={c.id} />
            </div>
          ))}
          {selected.size === 0 ? <p className="text-sm text-neutral-500">Nobody selected yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
