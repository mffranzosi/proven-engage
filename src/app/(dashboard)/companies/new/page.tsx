import { createCompany } from "@/lib/actions/companies";
import { SEGMENT_OPTIONS } from "@/lib/notion";

export default function NewCompanyPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">New company</h1>
      <form action={createCompany} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Name</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Segment</label>
          <div className="mt-1 space-y-1">
            {SEGMENT_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="segment" value={s} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
          Create company
        </button>
      </form>
    </div>
  );
}
