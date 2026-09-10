import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listContacts, listCompanies } from "@/lib/notion";
import { requireUser } from "@/lib/require-user";
import {
  sendCampaign,
  markContactStatus,
  updateCampaign,
  updateCampaignSendAs,
  deleteCampaign,
  addContactsToCampaign,
  checkCampaignReplies,
} from "@/lib/actions/campaigns";
import { ContactPicker } from "@/components/contact-picker";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Queued",
  SENT: "Sent",
  OPENED: "Opened",
  REPLIED: "Replied",
  BOUNCED: "Bounced",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [campaign, contacts, companies, accounts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { createdAt: "asc" } },
        createdBy: true,
        sendAsAccount: true,
        attachments: true,
      },
    }),
    listContacts(),
    listCompanies(),
    prisma.connectedEmailAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);

  if (!campaign) notFound();

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const sendCampaignWithId = sendCampaign.bind(null, campaign.id);
  const updateCampaignWithId = updateCampaign.bind(null, campaign.id);
  const updateSendAsWithId = updateCampaignSendAs.bind(null, campaign.id);
  const deleteCampaignWithId = deleteCampaign.bind(null, campaign.id);
  const addContactsWithId = addContactsToCampaign.bind(null, campaign.id);
  const checkRepliesWithId = checkCampaignReplies.bind(null, campaign.id);
  const queuedCount = campaign.contacts.filter((c) => c.status === "QUEUED").length;
  const checkableCount = campaign.contacts.filter((c) => c.status === "SENT" || c.status === "OPENED").length;
  const isDraft = campaign.contacts.every((c) => c.status === "QUEUED");

  const memberContactIds = new Set(campaign.contacts.map((c) => c.notionContactId));
  const availableContacts = contacts
    .filter((c) => !memberContactIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <Link href="/campaigns" className="text-sm text-neutral-500 hover:underline">
            ← Campaigns
          </Link>
          <DeleteCampaignButton
            action={deleteCampaignWithId}
            campaignName={campaign.name}
            className="text-xs text-neutral-400 hover:text-proven-coral hover:underline"
          />
        </div>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-neutral-900">{campaign.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isDraft ? "bg-neutral-100 text-neutral-600" : "bg-proven-blue/10 text-proven-blue"
            }`}
          >
            {isDraft ? "Draft" : "Active"}
          </span>
        </div>
        <form action={updateSendAsWithId} className="mt-2 flex items-center gap-2">
          <label className="text-xs text-neutral-400">Sending from</label>
          <select
            name="sendAsAccountId"
            defaultValue={campaign.sendAsAccountId}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
          <button type="submit" className="text-xs font-medium text-neutral-700 hover:underline">
            Save
          </button>
        </form>
        {campaign.attachments.length > 0 ? (
          <p className="mt-2 text-xs text-neutral-400">
            Attachments: {campaign.attachments.map((a) => a.filename).join(", ")}
          </p>
        ) : null}
      </div>

      {isDraft ? (
        <form action={updateCampaignWithId} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Edit campaign</h2>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Campaign name</label>
            <input name="name" defaultValue={campaign.name} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Subject</label>
            <input name="subject" defaultValue={campaign.subject} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Body</label>
            <p className="mb-1 text-xs text-neutral-400">
              Use <code>{"{{firstName}}"}</code> or <code>{"{{fullName}}"}</code> to merge in the contact&apos;s name.
            </p>
            <textarea
              name="bodyTemplate"
              rows={8}
              required
              defaultValue={campaign.bodyTemplate}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Save draft
          </button>
        </form>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Subject: {campaign.subject}</h2>
          <div
            className="prose prose-sm max-w-none rounded-md border border-neutral-100 bg-neutral-50 p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: campaign.bodyTemplate }}
          />
          <p className="mt-2 text-xs text-neutral-400">
            Sending has started, so the message can no longer be edited.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Recipients ({campaign.contacts.length})</h2>
          <div className="flex items-center gap-2">
            {checkableCount > 0 ? (
              <form action={checkRepliesWithId}>
                <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  Check for replies
                </button>
              </form>
            ) : null}
            {queuedCount > 0 ? (
              <form action={sendCampaignWithId}>
                <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
                  Send to {queuedCount} queued contact{queuedCount === 1 ? "" : "s"}
                </button>
              </form>
            ) : queuedCount === 0 && checkableCount === 0 ? (
              <span className="text-sm text-neutral-400">All sent</span>
            ) : null}
          </div>
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
              const contact = contactById.get(cc.notionContactId);
              return (
                <tr key={cc.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2">
                    <Link href={`/contacts/${cc.notionContactId}`} className="text-neutral-900 hover:underline">
                      {contact?.name ?? "(unknown contact)"}
                    </Link>
                    <span className="ml-2 text-neutral-400">{contact?.email}</span>
                    {cc.status === "REPLIED" && cc.replySnippet ? (
                      <div className="mt-1 text-xs italic text-neutral-500">&ldquo;{cc.replySnippet}&rdquo;</div>
                    ) : null}
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

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Add more recipients</h2>
        <ContactPicker contacts={availableContacts} companies={companies} formAction={addContactsWithId} />
      </div>
    </div>
  );
}
