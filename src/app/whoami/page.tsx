import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { choosePersona } from "@/lib/actions/unlock";

export const dynamic = "force-dynamic";

export default async function WhoAmIPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <Image src="/proven-logo.png" alt="PROVEN" width={112} height={22} priority className="mb-4 h-6 w-auto" />
        <h1 className="mb-1 text-lg font-semibold text-proven-blue">Who are you?</h1>
        <p className="mb-6 text-sm text-neutral-500">
          This just labels what you create in ENGAGE — pick your name below.
        </p>

        {error ? (
          <p className="mb-4 rounded-md bg-proven-coral/10 px-3 py-2 text-sm text-proven-coral">
            That didn&apos;t work — try again.
          </p>
        ) : null}

        <div className="space-y-2">
          {users.map((u) => (
            <form key={u.id} action={choosePersona}>
              <input type="hidden" name="userId" value={u.id} />
              <button
                type="submit"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-left text-sm font-medium text-neutral-900 hover:border-proven-yellow hover:bg-proven-yellow/10"
              >
                {u.name || u.email}
              </button>
            </form>
          ))}
          {users.length === 0 ? <p className="text-sm text-neutral-500">No team members set up yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
