import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateContact, addContactNote } from "@/lib/actions/contacts";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact, companies, awarenessStages] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        deals: { include: { engagementStage: true }, orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
      },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.stage.findMany({ where: { type: "AWARENESS" }, orderBy: { order: "asc" } }),
  ]);

  if (!contact) notFound();

  const updateContactWithId = updateContact.bind(null, contact.id);
  const addNoteWithId = addContactNote.bind(null, contact.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/contacts" className="text-sm text-neutral-500 hover:underline">
          ← Contacts
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{contact.name}</h1>
      </div>

      <form action={updateContactWithId} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Name</label>
            <input name="name" defaultValue={contact.name} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Email</label>
            <input name="email" type="email" defaultValue={contact.email} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Title</label>
            <input name="title" defaultValue={contact.title ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Phone</label>
            <input name="phone" defaultValue={contact.phone ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Company</label>
            <select name="companyId" defaultValue={contact.companyId ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
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
            <select name="awarenessStageId" defaultValue={contact.awarenessStageId ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <option value="">— None —</option>
              {awarenessStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Notes</label>
          <textarea name="notes" rows={3} defaultValue={contact.notes ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Save
        </button>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Deals</h2>
          <Link href={`/deals?contactId=${contact.id}`} className="text-sm text-neutral-600 hover:underline">
            View pipeline
          </Link>
        </div>
        {contact.deals.length === 0 ? (
          <p className="text-sm text-neutral-500">No deals yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {contact.deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-neutral-900">{d.title}</span>
                <span className="text-neutral-500">{d.engagementStage.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Activity</h2>
        <form action={addNoteWithId} className="mb-4 flex gap-2">
          <input name="body" placeholder="Add a note…" className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Add
          </button>
        </form>
        {contact.activities.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {contact.activities.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="text-neutral-400">{a.createdAt.toLocaleString()}</span>{" "}
                <span className="text-neutral-700">{a.body}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
