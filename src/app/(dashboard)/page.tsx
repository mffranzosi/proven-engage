import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listCompanies, listContacts, getContact } from "@/lib/notion";
import { ContactsKanban } from "@/components/contacts-kanban";
import { acknowledgeReply } from "@/lib/actions/campaigns";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const [companies, contacts, activeCampaigns, recentActivity, pendingReplies] = await Promise.all([
    listCompanies(),
    listContacts(),
    prisma.campaign.count(),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { createdBy: true },
    }),
    prisma.campaignContact.findMany({
      where: { status: "REPLIED", repliedAcknowledgedAt: null },
      orderBy: { repliedAt: "desc" },
      include: { campaign: true },
    }),
  ]);

  const recentActivityWithNames = await Promise.all(
    recentActivity.map(async (a) => ({
      ...a,
      contactName: (await getContact(a.notionContactId).catch(() => null))?.name ?? "(unknown contact)",
    })),
  );

  const pendingRepliesWithNames = await Promise.all(
    pendingReplies.map(async (cc) => ({
      ...cc,
      contactName: (await getContact(cc.notionContactId).catch(() => null))?.name ?? "(unknown contact)",
    })),
  );

  const stats = [
    { label: "Companies", value: companies.length },
    { label: "Contacts", value: contacts.length },
    { label: "Campaigns", value: activeCampaigns },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-sm text-neutral-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-900">{s.value}</div>
          </div>
        ))}
      </div>

      {pendingRepliesWithNames.length > 0 ? (
        <div className="rounded-lg border border-proven-yellow-dark/40 bg-proven-yellow/10 p-4">
          <h2 className="mb-3 text-sm font-semibold text-proven-blue">
            Pending actions ({pendingRepliesWithNames.length})
          </h2>
          <ul className="space-y-2">
            {pendingRepliesWithNames.map((cc) => {
              const acknowledge = acknowledgeReply.bind(null, cc.id);
              return (
                <li key={cc.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <Link href={`/contacts/${cc.notionContactId}`} className="font-medium text-proven-blue hover:underline">
                      {cc.contactName}
                    </Link>{" "}
                    <span className="text-proven-black/80">
                      just replied to &ldquo;{cc.campaign.name}&rdquo; — reply ASAP
                    </span>
                  </span>
                  <form action={acknowledge}>
                    <button type="submit" className="shrink-0 rounded-md border border-proven-yellow-dark/50 px-2 py-1 text-xs font-medium text-proven-black/80 hover:bg-proven-yellow/20">
                      Acknowledge
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Recent activity</h2>
        {recentActivityWithNames.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentActivityWithNames.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="font-medium text-neutral-900">{a.contactName}</span>{" "}
                <span className="text-neutral-500">— {a.body}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Contacts pipeline — from unaware to purchasing
        </h2>
        <ContactsKanban contacts={contacts} companies={companies} />
      </div>
    </div>
  );
}
