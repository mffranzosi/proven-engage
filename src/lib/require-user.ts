import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Auth is disabled: every request acts as the first admin account rather than
// a signed-in session, so createdBy/attribution fields still have someone to point to.
async function getDefaultUser() {
  return prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
}

export async function requireUser() {
  const user = await getDefaultUser();
  if (!user) redirect("/register");
  return user;
}

export async function requireAdmin() {
  return requireUser();
}
