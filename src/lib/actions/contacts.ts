"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";

export async function createContact(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const title = String(formData.get("title") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const companyId = String(formData.get("companyId") || "").trim() || null;
  const awarenessStageId = String(formData.get("awarenessStageId") || "").trim() || null;

  if (!name || !email) throw new Error("Name and email are required.");

  const contact = await prisma.contact.create({
    data: { name, email, title, phone, companyId, awarenessStageId },
  });

  await prisma.activity.create({
    data: { contactId: contact.id, type: "NOTE", body: "Contact created", createdById: user.id },
  });

  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(contactId: string, formData: FormData) {
  await requireUser();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const title = String(formData.get("title") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const companyId = String(formData.get("companyId") || "").trim() || null;
  const awarenessStageId = String(formData.get("awarenessStageId") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name || !email) throw new Error("Name and email are required.");

  await prisma.contact.update({
    where: { id: contactId },
    data: { name, email, title, phone, companyId, awarenessStageId, notes },
  });

  redirect(`/contacts/${contactId}`);
}

export async function addContactNote(contactId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await prisma.activity.create({
    data: { contactId, type: "NOTE", body, createdById: user.id },
  });

  redirect(`/contacts/${contactId}`);
}
