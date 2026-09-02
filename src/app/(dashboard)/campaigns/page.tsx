import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const user = await requireUser();
  const { gmail } = await searchParams;

  const [dbUser, campaigns] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contacts: true } } },
    }),
  ]);

  const connected = Boolean(dbUser?.googleRefreshToken);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Campaigns</h1>
        <Link href="/campaigns/new" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          New campaign
        </Link>
      </div>

      {gmail === "connected" ? (
        <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">Google account connected.</div>
      ) : null}
      {gmail === "error" || gmail === "no_refresh_token" ? (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Couldn&apos;t connect your Google account. Try again.
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        {connected ? (
          <p className="text-sm text-neutral-600">
            Sending as <span className="font-medium text-neutral-900">{dbUser?.googleEmail}</span>.{" "}
            <a href="/api/gmail/connect" className="text-neutral-500 hover:underline">
              Reconnect
            </a>
          </p>
        ) : (
          <a href="/api/gmail/connect" className="text-sm font-medium text-neutral-900 hover:underline">
            Connect your Google account to send campaigns →
          </a>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Subject</th>
              <th className="px-4 py-2 font-medium">Contacts</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/campaigns/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">{c.subject}</td>
                <td className="px-4 py-2 text-neutral-600">{c._count.contacts}</td>
              </tr>
            ))}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  No campaigns yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
