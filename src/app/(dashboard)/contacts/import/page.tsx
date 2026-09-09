import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { uploadLinkedInCsv } from "@/lib/actions/linkedin-import";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  TRIAGE: "Needs triage",
  DEDUP: "Needs match review",
  DONE: "Done",
};

export default async function LinkedInImportPage() {
  const imports = await prisma.linkedInImport.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href="/contacts" className="text-sm text-neutral-500 hover:underline">
          ← Contacts
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Import from LinkedIn</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Upload your connections export</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Request your data export from LinkedIn (Settings → Data privacy → Get a copy of your data —
          just &ldquo;Connections&rdquo; is enough), then upload the file here — .csv or .xlsx both work.
        </p>
        <form action={uploadLinkedInCsv} className="flex items-center gap-2">
          <input
            type="file"
            name="file"
            accept=".csv,.xlsx,.xls"
            required
            className="flex-1 text-sm text-neutral-400 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-proven-yellow file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-proven-black hover:file:bg-proven-yellow-dark"
          />
          <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Upload
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Uploaded</th>
              <th className="px-4 py-2 font-medium">Connections</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <tr key={imp.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/contacts/import/${imp.id}`} className="font-medium text-neutral-900 hover:underline">
                    {imp.createdAt.toLocaleString()}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">{imp._count.items}</td>
                <td className="px-4 py-2 text-neutral-600">{STATUS_LABEL[imp.status]}</td>
              </tr>
            ))}
            {imports.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  No imports yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
