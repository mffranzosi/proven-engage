"use client";

import { useActionState } from "react";
import { sendCampaign } from "@/lib/actions/campaigns";
import type { SendResult } from "@/lib/send-result";

export function SendCampaignButton({ campaignId, queuedCount }: { campaignId: string; queuedCount: number }) {
  const [result, formAction, pending] = useActionState<SendResult, FormData>(sendCampaign.bind(null, campaignId), null);

  return (
    <div className="text-right">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm(`Send this campaign to ${queuedCount} contact${queuedCount === 1 ? "" : "s"} now? This can't be undone.`)) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark disabled:opacity-60"
        >
          {pending ? "Sending…" : `Send to ${queuedCount} queued contact${queuedCount === 1 ? "" : "s"}`}
        </button>
      </form>
      {pending ? (
        <p className="mt-2 max-w-xs text-xs text-neutral-500">
          Sending emails one by one. Keep this page open; it can take a minute for larger lists.
        </p>
      ) : null}
      {!pending && result ? (
        <div className="mt-2 max-w-xs space-y-0.5 text-xs">
          <p className={result.sent > 0 ? "text-green-700" : "text-neutral-500"}>
            {result.sent} email{result.sent === 1 ? "" : "s"} sent.
          </p>
          {result.noEmail > 0 ? (
            <p className="text-neutral-500">{result.noEmail} skipped: no email address.</p>
          ) : null}
          {result.failed > 0 ? (
            <p className="text-proven-coral">
              {result.failed} failed and remain queued{result.stoppedEarly ? " (sending stopped after repeated errors)" : ""}
              {result.firstError ? `: ${result.firstError}` : ""}. Fix the cause, then send again.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
