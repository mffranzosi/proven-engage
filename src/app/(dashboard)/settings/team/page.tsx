import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-user";
import { createTeamMember } from "@/lib/actions/auth";

export default async function TeamSettingsPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Team</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Members</h2>
        <ul className="divide-y divide-neutral-100">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {u.name || u.email} {u.id === admin.id ? <span className="text-neutral-400">(you)</span> : null}
              </span>
              <span className="text-neutral-500">{u.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Add a colleague</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Set them a temporary password directly — there is no email invite flow yet, so share it with them yourself.
        </p>
        <form action={createTeamMember} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Name</label>
            <input name="name" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Temporary password</label>
            <input name="password" type="text" required minLength={8} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Role</label>
            <select name="role" defaultValue="MEMBER" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
