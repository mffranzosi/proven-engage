import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany, listContacts } from "@/lib/notion";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [company, allContacts] = await Promise.all([
    getCompany(id).catch(() => null),
    listContacts(),
  ]);

  if (!company) notFound();

  const contacts = allContacts.filter((c) => c.companyId === id);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/companies" className="text-sm text-neutral-500 hover:underline">
          ← Companies
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{company.name}</h1>
        {company.segment.length > 0 ? (
          <p className="mt-1 text-sm text-neutral-500">{company.segment.join(", ")}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Contacts</h2>
          <Link href={`/contacts/new?companyId=${company.id}`} className="text-sm text-neutral-600 hover:underline">
            + Add contact
          </Link>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-neutral-500">No contacts yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {contacts.map((c) => (
              <li key={c.id} className="py-2">
                <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-neutral-900 hover:underline">
                  {c.name}
                </Link>
                <span className="ml-2 text-sm text-neutral-500">{c.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
