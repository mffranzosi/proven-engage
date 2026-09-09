"use server";

import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { createCompany as notionCreateCompany, archiveCompany, SEGMENT_OPTIONS } from "@/lib/notion";

export async function createCompany(formData: FormData) {
  await requireUser();

  const name = String(formData.get("name") || "").trim();
  const segment = formData.getAll("segment").map(String).filter((s) => (SEGMENT_OPTIONS as readonly string[]).includes(s));

  if (!name) throw new Error("Company name is required.");

  const company = await notionCreateCompany({ name, segment });
  redirect(`/companies/${company.id}`);
}

export async function deleteCompany(companyId: string) {
  await requireUser();
  await archiveCompany(companyId);
  redirect(`/companies`);
}
