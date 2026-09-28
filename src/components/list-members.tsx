"use client";

import { useState } from "react";
import Link from "next/link";

export function ListMembers({
  members,
  formAction,
}: {
  members: { id: string; contactId: string; name: string }[];
  formAction: (formData: FormData) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = members.length > 0 && selected.size === members.length;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Remove ${selected.size} contact${selected.size === 1 ? "" : "s"} from this list?`)) e.preventDefault();
      }}
    >
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="memberIds" value={id} />
      ))}
      <div className="mb-2 flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-neutral-500">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)))}
          />
          Select all
        </label>
        <button
          type="submit"
          disabled={selected.size === 0}
          className="font-medium text-proven-coral hover:underline disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline"
        >
          Remove selected ({selected.size})
        </button>
      </div>
      <ul className="divide-y divide-neutral-100">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
            <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
            <Link href={`/contacts/${m.contactId}`} className="font-medium text-neutral-900 hover:underline">
              {m.name}
            </Link>
          </li>
        ))}
      </ul>
    </form>
  );
}
