import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { name: "asc" },
    include: { company: true, awarenessStage: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Contacts</h1>
        <Link href="/contacts/new" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          New contact
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Awareness</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">{c.company?.name ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-600">{c.email}</td>
                <td className="px-4 py-2 text-neutral-600">{c.awarenessStage?.name ?? "—"}</td>
              </tr>
            ))}
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  No contacts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
