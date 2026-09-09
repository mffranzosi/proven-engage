import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createSequence } from "@/lib/actions/sequences";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const sequences = await prisma.sequence.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { steps: true, enrollments: true } },
    },
  });

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Sequences</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">New sequence</h2>
        <form action={createSequence} className="flex gap-2">
          <input name="name" placeholder="e.g. Christmas offer" required className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
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
              <th className="px-4 py-2 font-medium">Steps</th>
              <th className="px-4 py-2 font-medium">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {sequences.map((s) => (
              <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/sequences/${s.id}`} className="font-medium text-neutral-900 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">{s._count.steps}</td>
                <td className="px-4 py-2 text-neutral-600">{s._count.enrollments}</td>
              </tr>
            ))}
            {sequences.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  No sequences yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
