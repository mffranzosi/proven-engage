import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listContacts, listCompanies } from "@/lib/notion";
import { addContactsToList, removeMembersFromList } from "@/lib/actions/lists";
import { ContactPicker } from "@/components/contact-picker";
import { ListMembers } from "@/components/list-members";

export const dynamic = "force-dynamic";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [list, contacts, companies] = await Promise.all([
    prisma.contactList.findUnique({ where: { id }, include: { members: true } }),
    listContacts(),
    listCompanies(),
  ]);

  if (!list) notFound();

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const memberContactIds = new Set(list.members.map((m) => m.notionContactId));
  const availableContacts = contacts
    .filter((c) => !memberContactIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const addContactsWithId = addContactsToList.bind(null, list.id);
  const removeMembersWithId = removeMembersFromList.bind(null, list.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href="/lists" className="text-sm text-neutral-500 hover:underline">
          ← Lists
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{list.name}</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Members ({list.members.length})</h2>
        {list.members.length === 0 ? (
          <p className="text-sm text-neutral-500">No contacts in this list yet.</p>
        ) : (
          <ListMembers
            members={list.members.map((m) => ({
              id: m.id,
              contactId: m.notionContactId,
              name: contactById.get(m.notionContactId)?.name ?? "(unknown contact)",
            }))}
            formAction={removeMembersWithId}
          />
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Add contacts</h2>
        <ContactPicker contacts={availableContacts} companies={companies} formAction={addContactsWithId} />
      </div>
    </div>
  );
}
