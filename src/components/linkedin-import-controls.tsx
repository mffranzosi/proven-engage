"use client";

import { useEffect, useState, useTransition } from "react";
import {
  setItemSelected,
  setItemDecision,
  setBulkDecision,
  setItemEnrichEmail,
  setItemSegment,
} from "@/lib/actions/linkedin-import";

export function TriageCheckbox({ itemId, defaultChecked }: { itemId: string; defaultChecked: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      defaultChecked={defaultChecked}
      disabled={isPending}
      onChange={(e) => {
        const checked = e.target.checked;
        startTransition(() => {
          setItemSelected(itemId, checked);
        });
      }}
      className="mt-0.5 disabled:opacity-60"
    />
  );
}

export function DecisionRadios({
  itemId,
  matchedContactName,
  currentDecision,
}: {
  itemId: string;
  matchedContactName: string | null;
  currentDecision: "create_new" | "merge" | "skip" | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [decision, setDecision] = useState(currentDecision);
  useEffect(() => setDecision(currentDecision), [currentDecision]);
  const name = `decision-display-${itemId}`;

  function onChange(value: "create_new" | "merge" | "skip") {
    setDecision(value);
    startTransition(() => {
      setItemDecision(itemId, value);
    });
  }

  return (
    <fieldset disabled={isPending} className="space-y-2 disabled:opacity-60">
      {decision === null ? (
        <p className="text-xs font-medium text-proven-coral">Not yet reviewed — pick one:</p>
      ) : null}
      {matchedContactName ? (
        <label className="flex items-center gap-2">
          <input type="radio" name={name} checked={decision === "merge"} onChange={() => onChange("merge")} />
          Same person as existing contact &ldquo;{matchedContactName}&rdquo; — update it
        </label>
      ) : null}
      <label className="flex items-center gap-2">
        <input type="radio" name={name} checked={decision === "create_new"} onChange={() => onChange("create_new")} />
        {matchedContactName ? "Actually a different person — add as new contact" : "Add as new contact"}
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name={name} checked={decision === "skip"} onChange={() => onChange("skip")} />
        Skip — don&apos;t add to the CRM
      </label>
    </fieldset>
  );
}

export function BulkAcceptButton({
  importId,
  confidence,
  decision,
  label,
}: {
  importId: string;
  confidence: string;
  decision: "create_new" | "merge" | "skip";
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          setBulkDecision(importId, confidence, decision);
        });
      }}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
    >
      {isPending ? "Applying…" : label}
    </button>
  );
}

export function EnrichEmailCheckbox({ itemId, email, defaultChecked }: { itemId: string; email: string; defaultChecked: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="ml-6 flex items-center gap-2 text-xs text-neutral-500">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={isPending}
        onChange={(e) => {
          const checked = e.target.checked;
          startTransition(() => {
            setItemEnrichEmail(itemId, checked);
          });
        }}
      />
      Fill in email: {email}
    </label>
  );
}

export function SegmentSelect({ itemId, defaultValue, options }: { itemId: string; defaultValue: string; options: readonly string[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={defaultValue}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => {
          setItemSegment(itemId, value);
        });
      }}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-60"
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
