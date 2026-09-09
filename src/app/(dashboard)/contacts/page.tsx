import Link from "next/link";
import { listContacts, listCompanies } from "@/lib/notion";
import { ContactsTable } from "@/components/contacts-table";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([listContacts(), listCompanies()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Contacts</h1>
        <div className="flex items-center gap-3">
          <Link href="/contacts/pipeline" className="text-sm text-neutral-600 hover:underline">
            Pipeline view
          </Link>
          <Link href="/contacts/import" className="text-sm text-neutral-600 hover:underline">
            Import from LinkedIn
          </Link>
          <Link href="/contacts/new" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            New contact
          </Link>
        </div>
      </div>

      <ContactsTable contacts={contacts} companies={companies} />
    </div>
  );
}
