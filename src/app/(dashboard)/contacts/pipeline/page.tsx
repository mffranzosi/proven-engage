import Link from "next/link";
import { listContacts, listCompanies } from "@/lib/notion";
import { ContactsKanban } from "@/components/contacts-kanban";

export const dynamic = "force-dynamic";

export default async function ContactsPipelinePage() {
  const [contacts, companies] = await Promise.all([listContacts(), listCompanies()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Contacts pipeline</h1>
        <Link href="/contacts" className="text-sm text-neutral-600 hover:underline">
          Table view
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        Grouped by Business status — from unaware (neutral) through to purchasing.
      </p>

      <ContactsKanban contacts={contacts} companies={companies} />
    </div>
  );
}
