"use client";

import { useActionState } from "react";
import { loginWithCredentials } from "@/lib/actions/login";

async function action(_prevState: string | null, formData: FormData) {
  try {
    await loginWithCredentials(formData);
    return null;
  } catch (error) {
    if (error instanceof Error && error.message !== "NEXT_REDIRECT") {
      return error.message;
    }
    throw error;
  }
}

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">PROVEN CRM</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to continue.</p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Password</label>
            <input name="password" type="password" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={pending} className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
