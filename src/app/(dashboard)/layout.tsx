import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { doSignOut } from "@/lib/actions/signout";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/companies", label: "Companies" },
  { href: "/contacts", label: "Contacts" },
  { href: "/deals", label: "Deals" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/settings/team", label: "Team" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="flex">
        <aside className="sticky top-0 flex h-screen w-56 flex-col justify-between border-r border-neutral-200 bg-white p-4">
          <div>
            <div className="mb-6 px-2 text-lg font-semibold text-neutral-900">PROVEN CRM</div>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="space-y-2 border-t border-neutral-200 pt-4">
            <div className="px-2 text-xs text-neutral-500">{user.email}</div>
            <form action={doSignOut}>
              <button type="submit" className="w-full rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100">
                Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
