import Link from "next/link";
import { notFound } from "next/navigation";
import { getContact, listCompanies, BUSINESS_STATUS_VALUES } from "@/lib/notion";
import { prisma } from "@/lib/prisma";
import { updateContact, addContactNote } from "@/lib/actions/contacts";
import { ContactStatusSelect } from "@/components/contact-status-select";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contact, companies] = await Promise.all([
    getContact(id).catch(() => null),
    listCompanies(),
  ]);

  if (!contact) notFound();

  const activities = await prisma.activity.findMany({
    where: { notionContactId: id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: true },
  });

  const sortedCompanies = [...companies].sort((a, b) => a.name.localeCompare(b.name));
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
            <input name="email" type="email" defaultValue={contact.email ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Phone</label>
            <input name="phone" defaultValue={contact.phone ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Company</label>
            <select name="companyId" defaultValue={contact.companyId ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <option value="">— None —</option>
              {sortedCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Next action</label>
          <input name="nextAction" defaultValue={contact.nextAction ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div className="text-sm text-neutral-500">Contact status: {contact.contactStatus ?? "—"}</div>
        <p className="text-xs text-neutral-400">
          Contact status is set from Notion — edit it there or in the Proven CRM view.
        </p>
        <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
          Save
        </button>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Pipeline stage</h2>
        <ContactStatusSelect
          contactId={contact.id}
          currentStatus={contact.businessStatus ?? "neutral"}
          statuses={BUSINESS_STATUS_VALUES}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Activity</h2>
        <form action={addNoteWithId} className="mb-4 flex gap-2">
          <input name="body" placeholder="Add a note…" className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Add
          </button>
        </form>
        {activities.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => (
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
