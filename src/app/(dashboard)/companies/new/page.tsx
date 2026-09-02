import { createCompany } from "@/lib/actions/companies";

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
          <label className="block text-sm font-medium text-neutral-700">Domain</label>
          <input name="domain" placeholder="acme.com" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Notes</label>
          <textarea name="notes" rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create company
        </button>
      </form>
    </div>
  );
}
