"use client";

import { useTransition } from "react";
import { moveDealStage } from "@/lib/actions/deals";

export function DealStageSelect({
  dealId,
  currentStageId,
  stages,
}: {
  dealId: string;
  currentStageId: string;
  stages: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStageId}
      disabled={isPending}
      onChange={(e) => {
        const stageId = e.target.value;
        startTransition(() => {
          moveDealStage(dealId, stageId);
        });
      }}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-60"
    >
      {stages.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
