import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/require-user";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/companies", label: "Companies" },
  { href: "/contacts", label: "Contacts" },
  { href: "/contacts/pipeline", label: "Pipeline" },
  { href: "/lists", label: "Lists" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/sequences", label: "Sequences" },
  { href: "/settings/accounts", label: "Connected accounts" },
  { href: "/settings/team", label: "Team" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="flex">
        <aside className="sticky top-0 flex h-screen w-56 flex-col justify-between border-r border-neutral-200 bg-white p-4">
          <div>
            <Link href="/" className="mb-6 block px-2">
              <Image src="/proven-logo.png" alt="PROVEN" width={112} height={22} priority className="h-6 w-auto" />
              <div className="mt-0.5 text-[11px] font-medium tracking-wide text-proven-blue">ENGAGE</div>
            </Link>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-proven-yellow/15 hover:text-proven-blue"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="space-y-2 border-t border-neutral-200 pt-4">
            <p className="px-2 text-xs text-neutral-400">{user.email}</p>
          </div>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
