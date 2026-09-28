"use client";

import { useActionState } from "react";
import { sendTestEmail } from "@/lib/actions/campaigns";
import type { TestSendResult } from "@/lib/send-result";

export function TestSendButton({ campaignId }: { campaignId: string }) {
  const [result, formAction, pending] = useActionState<TestSendResult, FormData>(sendTestEmail.bind(null, campaignId), null);

  return (
    <div className="text-right">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          {pending ? "Sending test…" : "Send test to myself"}
        </button>
      </form>
      {result ? (
        <p className={`mt-1 max-w-xs text-xs ${result.ok ? "text-green-700" : "text-proven-coral"}`}>{result.message}</p>
      ) : null}
    </div>
  );
}
