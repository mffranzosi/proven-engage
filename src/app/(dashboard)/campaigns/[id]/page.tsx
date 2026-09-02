import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendCampaign, markContactStatus } from "@/lib/actions/campaigns";

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Queued",
  SENT: "Sent",
  OPENED: "Opened",
  REPLIED: "Replied",
  BOUNCED: "Bounced",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      contacts: { include: { contact: true }, orderBy: { createdAt: "asc" } },
      createdBy: true,
    },
  });

  if (!campaign) notFound();

  const sendCampaignWithId = sendCampaign.bind(null, campaign.id);
  const queuedCount = campaign.contacts.filter((c) => c.status === "QUEUED").length;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/campaigns" className="text-sm text-neutral-500 hover:underline">
          ← Campaigns
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{campaign.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">Subject: {campaign.subject}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Body preview</h2>
        <div
          className="prose prose-sm max-w-none rounded-md border border-neutral-100 bg-neutral-50 p-3 text-sm"
          dangerouslySetInnerHTML={{ __html: campaign.bodyTemplate }}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Recipients ({campaign.contacts.length})</h2>
          {queuedCount > 0 ? (
            <form action={sendCampaignWithId}>
              <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                Send to {queuedCount} queued contact{queuedCount === 1 ? "" : "s"}
              </button>
            </form>
          ) : (
            <span className="text-sm text-neutral-400">All sent</span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-neutral-500">
            <tr>
              <th className="py-2 font-medium">Contact</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {campaign.contacts.map((cc) => {
              const markReplied = markContactStatus.bind(null, cc.id, "REPLIED");
              return (
                <tr key={cc.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2">
                    <Link href={`/contacts/${cc.contactId}`} className="text-neutral-900 hover:underline">
                      {cc.contact.name}
                    </Link>
                    <span className="ml-2 text-neutral-400">{cc.contact.email}</span>
                  </td>
                  <td className="py-2 text-neutral-600">{STATUS_LABEL[cc.status]}</td>
                  <td className="py-2 text-right">
                    {cc.status === "SENT" || cc.status === "OPENED" ? (
                      <form action={markReplied}>
                        <button type="submit" className="text-xs text-neutral-500 hover:underline">
                          Mark replied
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
