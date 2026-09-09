import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createList } from "@/lib/actions/lists";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const lists = await prisma.contactList.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Contact lists</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">New list</h2>
        <form action={createList} className="flex gap-2">
          <input name="name" placeholder="e.g. Software Recruiters France" required className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Create
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Contacts</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/lists/${l.id}`} className="font-medium text-neutral-900 hover:underline">
                    {l.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">{l._count.members}</td>
              </tr>
            ))}
            {lists.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-neutral-500">
                  No lists yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
