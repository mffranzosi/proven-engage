import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { readPersonaUserId, PERSONA_COOKIE_NAME } from "@/lib/unlock";

export async function requireUser() {
  const jar = await cookies();
  const userId = readPersonaUserId(jar.get(PERSONA_COOKIE_NAME)?.value);
  if (!userId) redirect("/whoami");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/whoami");

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
