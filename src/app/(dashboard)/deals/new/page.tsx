import { prisma } from "@/lib/prisma";
import { createDeal } from "@/lib/actions/deals";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  const { contactId } = await searchParams;
  const [contacts, stages] = await Promise.all([
    prisma.contact.findMany({ orderBy: { name: "asc" }, include: { company: true } }),
    prisma.stage.findMany({ where: { type: "ENGAGEMENT" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">New deal</h1>
      <form action={createDeal} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Title</label>
          <input name="title" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Contact</label>
          <select name="contactId" defaultValue={contactId ?? ""} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="" disabled>
              Select a contact
            </option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company.name})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Stage</label>
          <select name="engagementStageId" defaultValue={stages[0]?.id ?? ""} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Value (€)</label>
          <input name="value" type="number" step="0.01" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create deal
        </button>
      </form>
    </div>
  );
}
