"use client";

import { useTransition } from "react";
import { moveContactBusinessStatus } from "@/lib/actions/contacts";

export function ContactStatusSelect({
  contactId,
  currentStatus,
  statuses,
}: {
  contactId: string;
  currentStatus: string;
  statuses: readonly string[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStatus}
      disabled={isPending}
      onChange={(e) => {
        const status = e.target.value;
        startTransition(() => {
          moveContactBusinessStatus(contactId, status);
        });
      }}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-60"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
