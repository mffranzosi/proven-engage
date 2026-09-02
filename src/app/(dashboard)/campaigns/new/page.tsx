import { prisma } from "@/lib/prisma";
import { createCampaign } from "@/lib/actions/campaigns";

export default async function NewCampaignPage() {
  const contacts = await prisma.contact.findMany({ orderBy: { name: "asc" }, include: { company: true } });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">New campaign</h1>
      <form action={createCampaign} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Campaign name</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Subject</label>
          <input name="subject" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Body</label>
          <p className="mb-1 text-xs text-neutral-400">
            Use <code>{"{{firstName}}"}</code> or <code>{"{{fullName}}"}</code> to merge in the contact&apos;s name. HTML is supported.
          </p>
          <textarea name="bodyTemplate" rows={8} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Contacts</label>
          <div className="mt-1 max-h-64 space-y-1 overflow-y-auto rounded-md border border-neutral-300 p-3">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="contactIds" value={c.id} />
                {c.name} <span className="text-neutral-400">({c.email})</span>
              </label>
            ))}
            {contacts.length === 0 ? <p className="text-sm text-neutral-500">No contacts yet.</p> : null}
          </div>
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create campaign
        </button>
      </form>
    </div>
  );
}
