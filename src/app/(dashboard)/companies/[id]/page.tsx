import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateCompany } from "@/lib/actions/companies";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: true,
      deals: { include: { engagementStage: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!company) notFound();

  const updateCompanyWithId = updateCompany.bind(null, company.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/companies" className="text-sm text-neutral-500 hover:underline">
          ← Companies
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{company.name}</h1>
      </div>

      <form action={updateCompanyWithId} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Name</label>
          <input name="name" defaultValue={company.name} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Domain</label>
          <input name="domain" defaultValue={company.domain ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Notes</label>
          <textarea name="notes" rows={3} defaultValue={company.notes ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Save
        </button>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Contacts</h2>
          <Link href={`/contacts/new?companyId=${company.id}`} className="text-sm text-neutral-600 hover:underline">
            + Add contact
          </Link>
        </div>
        {company.contacts.length === 0 ? (
          <p className="text-sm text-neutral-500">No contacts yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {company.contacts.map((c) => (
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

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Deals</h2>
        {company.deals.length === 0 ? (
          <p className="text-sm text-neutral-500">No deals yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {company.deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-neutral-900">{d.title}</span>
                <span className="text-neutral-500">{d.engagementStage.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
