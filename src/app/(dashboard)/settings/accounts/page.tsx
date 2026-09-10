import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { disconnectAccount } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";

export default async function ConnectedAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const user = await requireUser();
  const { gmail } = await searchParams;

  const accounts = await prisma.connectedEmailAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Connected accounts</h1>
      <p className="text-sm text-neutral-500">
        Connect the Gmail inboxes you send from. Each campaign or sequence you create picks one of them to send
        through and read replies from.
      </p>

      {gmail === "connected" ? (
        <div className="rounded-md bg-proven-lightblue/10 px-4 py-2 text-sm text-proven-blue">Account connected.</div>
      ) : null}
      {gmail === "error" || gmail === "no_refresh_token" ? (
        <div className="rounded-md bg-proven-coral/10 px-4 py-2 text-sm text-proven-coral">
          Couldn&apos;t connect that account. Try again.
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white">
        {accounts.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">No accounts connected yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {accounts.map((a) => {
              const disconnectWithId = disconnectAccount.bind(null, a.id);
              return (
                <li key={a.id} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm font-medium text-neutral-900">{a.email}</span>
                  <form action={disconnectWithId}>
                    <button type="submit" className="text-xs text-neutral-500 hover:underline">
                      Disconnect
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-neutral-100 p-4">
          <a href="/api/gmail/connect" className="text-sm font-medium text-neutral-900 hover:underline">
            Connect another account →
          </a>
        </div>
      </div>
    </div>
  );
}
