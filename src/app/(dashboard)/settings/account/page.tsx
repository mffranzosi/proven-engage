import { requireUser } from "@/lib/require-user";
import { changePassword } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const user = await requireUser();
  const { changed } = await searchParams;

  return (
    <div className="max-w-md space-y-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Account</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-500">Signed in as</p>
        <p className="text-sm font-medium text-neutral-900">{user.email}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Change password</h2>
        {changed ? (
          <p className="mb-4 rounded-md bg-proven-lightblue/10 px-3 py-2 text-sm text-proven-blue">
            Password updated.
          </p>
        ) : null}
        <form action={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Current password</label>
            <input
              name="currentPassword"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">New password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-400">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Confirm new password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
