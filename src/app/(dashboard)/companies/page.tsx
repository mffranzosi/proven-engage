import Link from "next/link";
import { listCompanies, listContacts } from "@/lib/notion";
import { CompaniesTable } from "@/components/companies-table";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const [companies, contacts] = await Promise.all([listCompanies(), listContacts()]);

  const contactCountByCompany = new Map<string, number>();
  for (const c of contacts) {
    if (!c.companyId) continue;
    contactCountByCompany.set(c.companyId, (contactCountByCompany.get(c.companyId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Companies</h1>
        <Link href="/companies/new" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
          New company
        </Link>
      </div>

      <CompaniesTable companies={companies} contactCountByCompany={contactCountByCompany} />
    </div>
  );
}
