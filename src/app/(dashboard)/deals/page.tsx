import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DealStageSelect } from "@/components/deal-stage-select";

export default async function DealsPage() {
  const [stages, deals] = await Promise.all([
    prisma.stage.findMany({ where: { type: "ENGAGEMENT" }, orderBy: { order: "asc" } }),
    prisma.deal.findMany({
      where: { status: "OPEN" },
      include: { contact: true, engagementStage: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const dealsByStage = new Map(stages.map((s) => [s.id, deals.filter((d) => d.engagementStageId === s.id)]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Deals</h1>
        <Link href="/deals/new" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          New deal
        </Link>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {stages.map((stage) => (
          <div key={stage.id} className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
              {stage.name} ({dealsByStage.get(stage.id)?.length ?? 0})
            </div>
            <div className="space-y-2 p-2">
              {(dealsByStage.get(stage.id) ?? []).map((deal) => (
                <div key={deal.id} className="rounded-md border border-neutral-200 p-2">
                  <Link href={`/contacts/${deal.contactId}`} className="text-xs font-medium text-neutral-900 hover:underline">
                    {deal.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-neutral-500">{deal.contact.name}</div>
                  {deal.value ? <div className="text-xs text-neutral-500">€{deal.value.toString()}</div> : null}
                  <div className="mt-2">
                    <DealStageSelect dealId={deal.id} currentStageId={deal.engagementStageId} stages={stages} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
