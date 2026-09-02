"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";

export async function createCompany(formData: FormData) {
  await requireUser();

  const name = String(formData.get("name") || "").trim();
  const domain = String(formData.get("domain") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name) throw new Error("Company name is required.");

  const company = await prisma.company.create({ data: { name, domain, notes } });
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(companyId: string, formData: FormData) {
  await requireUser();

  const name = String(formData.get("name") || "").trim();
  const domain = String(formData.get("domain") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name) throw new Error("Company name is required.");

  await prisma.company.update({ where: { id: companyId }, data: { name, domain, notes } });
  redirect(`/companies/${companyId}`);
}
