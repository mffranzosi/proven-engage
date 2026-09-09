import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { registerFirstAdmin } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <Image src="/proven-logo.png" alt="PROVEN" width={128} height={26} priority className="h-7 w-auto" />
          <p className="mt-3 text-sm font-medium tracking-wide text-proven-blue">ENGAGE</p>
          <p className="mt-1 text-sm text-neutral-500">
            Create the first account. It will be an admin account.
          </p>
        </div>
        <form action={registerFirstAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Name</label>
            <input name="name" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Password</label>
            <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-neutral-400">At least 8 characters.</p>
          </div>
          <button type="submit" className="w-full rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Create admin account
          </button>
        </form>
      </div>
    </div>
  );
}
