"use client";

import Image from "next/image";
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

export function LoginForm() {
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <Image src="/proven-logo.png" alt="PROVEN" width={128} height={26} priority className="h-7 w-auto" />
          <p className="mt-3 text-sm font-medium tracking-wide text-proven-blue">ENGAGE</p>
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input name="remember" type="checkbox" className="rounded border-neutral-300" />
              Remember me
            </label>
            <a href="mailto:m.f.franzosi@gmail.com?subject=PROVEN%20Engage%20password%20reset" className="text-sm text-neutral-500 hover:underline">
              Forgot password?
            </a>
          </div>
          {error ? <p className="text-sm text-proven-coral">{error}</p> : null}
          <button type="submit" disabled={pending} className="w-full rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark disabled:opacity-60">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
