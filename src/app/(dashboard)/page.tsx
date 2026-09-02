import { prisma } from "@/lib/prisma";

export default async function DashboardHome() {
  const [companyCount, contactCount, openDeals, activeCampaigns, recentActivity] =
    await Promise.all([
      prisma.company.count(),
      prisma.contact.count(),
      prisma.deal.findMany({
        where: { status: "OPEN" },
        include: { engagementStage: true },
      }),
      prisma.campaign.count(),
      prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { contact: true, createdBy: true },
      }),
    ]);

  const dealsByStage = new Map<string, number>();
  for (const deal of openDeals) {
    const key = deal.engagementStage.name;
    dealsByStage.set(key, (dealsByStage.get(key) ?? 0) + 1);
  }

  const stats = [
    { label: "Companies", value: companyCount },
    { label: "Contacts", value: contactCount },
    { label: "Open deals", value: openDeals.length },
    { label: "Campaigns", value: activeCampaigns },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-sm text-neutral-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Open deals by stage</h2>
          {dealsByStage.size === 0 ? (
            <p className="text-sm text-neutral-500">No open deals yet.</p>
          ) : (
            <ul className="space-y-2">
              {[...dealsByStage.entries()].map(([stage, count]) => (
                <li key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{stage}</span>
                  <span className="font-medium text-neutral-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Recent activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium text-neutral-900">{a.contact.name}</span>{" "}
                  <span className="text-neutral-500">— {a.body}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
