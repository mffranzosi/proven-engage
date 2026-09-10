"use client";

import { useActionState } from "react";
import { disconnectAccount } from "@/lib/actions/accounts";

export function DisconnectAccountButton({ accountId }: { accountId: string }) {
  const [state, formAction, pending] = useActionState(disconnectAccount.bind(null, accountId), null);

  return (
    <div className="text-right">
      <form action={formAction}>
        <button type="submit" disabled={pending} className="text-xs text-neutral-500 hover:underline disabled:opacity-50">
          {pending ? "Disconnecting…" : "Disconnect"}
        </button>
      </form>
      {state?.error ? <p className="mt-1 text-xs text-proven-coral">{state.error}</p> : null}
    </div>
  );
}
