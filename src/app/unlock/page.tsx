import Image from "next/image";
import { unlockApp } from "@/lib/actions/unlock";

export const dynamic = "force-dynamic";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <Image src="/proven-logo.png" alt="PROVEN" width={112} height={22} priority className="mb-4 h-6 w-auto" />
        <h1 className="mb-1 text-lg font-semibold text-proven-blue">ENGAGE</h1>
        <p className="mb-6 text-sm text-neutral-500">Enter the team password to continue.</p>

        {error ? (
          <p className="mb-4 rounded-md bg-proven-coral/10 px-3 py-2 text-sm text-proven-coral">
            That password isn&apos;t right — try again.
          </p>
        ) : null}

        <form action={unlockApp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Password</label>
            <input
              name="password"
              type="password"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
