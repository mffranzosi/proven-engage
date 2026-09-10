import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { checkAllCampaignReplies, deleteCampaign } from "@/lib/actions/campaigns";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const user = await requireUser();
  const { gmail } = await searchParams;

  const [accounts, campaigns] = await Promise.all([
    prisma.connectedEmailAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { contacts: { select: { status: true } }, sendAsAccount: true },
    }),
  ]);

  const connected = accounts.length > 0;
  const anyCheckable = campaigns.some((c) => c.contacts.some((cc) => cc.status === "SENT" || cc.status === "OPENED"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Campaigns</h1>
        <div className="flex items-center gap-2">
          {connected && anyCheckable ? (
            <form action={checkAllCampaignReplies}>
              <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Check for replies
              </button>
            </form>
          ) : null}
          <Link href="/campaigns/new" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            New campaign
          </Link>
        </div>
      </div>

      {gmail === "connected" ? (
        <div className="rounded-md bg-proven-lightblue/10 px-4 py-2 text-sm text-proven-blue">Google account connected.</div>
      ) : null}
      {gmail === "error" || gmail === "no_refresh_token" ? (
        <div className="rounded-md bg-proven-coral/10 px-4 py-2 text-sm text-proven-coral">
          Couldn&apos;t connect your Google account. Try again.
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        {connected ? (
          <p className="text-sm text-neutral-600">
            Connected accounts: <span className="font-medium text-neutral-900">{accounts.map((a) => a.email).join(", ")}</span>.{" "}
            <a href="/settings/accounts" className="text-neutral-500 hover:underline">
              Manage
            </a>
          </p>
        ) : (
          <a href="/settings/accounts" className="text-sm font-medium text-neutral-900 hover:underline">
            Connect a Google account to send campaigns →
          </a>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Subject</th>
              <th className="px-4 py-2 font-medium">Sending from</th>
              <th className="px-4 py-2 font-medium">Sent</th>
              <th className="px-4 py-2 font-medium">Opened</th>
              <th className="px-4 py-2 font-medium">Replied</th>
              <th className="px-4 py-2 font-medium">Bounced</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const isDraft = c.contacts.every((cc) => cc.status === "QUEUED");
              const countOf = (status: string) => c.contacts.filter((cc) => cc.status === status).length;
              const deleteCampaignWithId = deleteCampaign.bind(null, c.id);
              return (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{c.subject}</td>
                  <td className="px-4 py-2 text-neutral-600">{c.sendAsAccount.email}</td>
                  <td className="px-4 py-2 text-neutral-600">{countOf("SENT")}</td>
                  <td className="px-4 py-2 text-neutral-600">{countOf("OPENED")}</td>
                  <td className="px-4 py-2 text-neutral-600">{countOf("REPLIED")}</td>
                  <td className="px-4 py-2 text-neutral-600">{countOf("BOUNCED")}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isDraft ? "bg-neutral-100 text-neutral-600" : "bg-proven-blue/10 text-proven-blue"
                      }`}
                    >
                      {isDraft ? "Draft" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteCampaignButton
                      action={deleteCampaignWithId}
                      campaignName={c.name}
                      className="text-xs text-neutral-400 hover:text-proven-coral hover:underline"
                    />
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-neutral-500">
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
