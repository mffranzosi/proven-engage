import { prisma } from "@/lib/prisma";
import { createContact } from "@/lib/actions/contacts";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const [companies, awarenessStages] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.stage.findMany({ where: { type: "AWARENESS" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">New contact</h1>
      <form action={createContact} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Name</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Title</label>
            <input name="title" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Phone</label>
            <input name="phone" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Company</label>
          <select name="companyId" defaultValue={companyId ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">— None —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Awareness stage</label>
          <select name="awarenessStageId" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">— None —</option>
            {awarenessStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create contact
        </button>
      </form>
    </div>
  );
}
