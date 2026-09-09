import Link from "next/link";
import { BUSINESS_STATUS_VALUES, type NotionCompany, type NotionContact } from "@/lib/notion";
import { ContactStatusSelect } from "@/components/contact-status-select";

export function ContactsKanban({
  contacts,
  companies,
}: {
  contacts: NotionContact[];
  companies: NotionCompany[];
}) {
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const byStatus = new Map(
    BUSINESS_STATUS_VALUES.map((s) => [s, contacts.filter((c) => (c.businessStatus ?? "neutral") === s)]),
  );

  return (
    <div className="grid grid-cols-6 gap-4">
      {BUSINESS_STATUS_VALUES.map((status) => (
        <div key={status} className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
            {status} ({byStatus.get(status)?.length ?? 0})
          </div>
          <div className="space-y-2 p-2">
            {(byStatus.get(status) ?? []).map((contact) => (
              <div key={contact.id} className="rounded-md border border-neutral-200 p-2">
                <Link href={`/contacts/${contact.id}`} className="text-xs font-medium text-neutral-900 hover:underline">
                  {contact.name}
                </Link>
                {contact.companyId ? (
                  <div className="mt-0.5 text-xs text-neutral-500">{companyById.get(contact.companyId)?.name ?? ""}</div>
                ) : null}
                <div className="mt-2">
                  <ContactStatusSelect
                    contactId={contact.id}
                    currentStatus={contact.businessStatus ?? "neutral"}
                    statuses={BUSINESS_STATUS_VALUES}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
