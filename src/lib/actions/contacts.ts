"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createContact as notionCreateContact,
  updateContact as notionUpdateContact,
  getContact as notionGetContact,
  archiveContact,
} from "@/lib/notion";

export async function createContact(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || undefined;
  const companyId = String(formData.get("companyId") || "").trim() || undefined;

  if (!name) throw new Error("Name is required.");

  const contact = await notionCreateContact({ name, email: email || undefined, phone, companyId });

  await prisma.activity.create({
    data: { notionContactId: contact.id, type: "NOTE", body: "Contact created", createdById: user.id },
  });

  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(contactId: string, formData: FormData) {
  await requireUser();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const companyId = String(formData.get("companyId") || "").trim() || null;
  const nextAction = String(formData.get("nextAction") || "").trim();

  if (!name) throw new Error("Name is required.");

  await notionUpdateContact(contactId, { name, email, phone, companyId, nextAction });

  redirect(`/contacts/${contactId}`);
}

export async function moveContactBusinessStatus(contactId: string, businessStatus: string) {
  const user = await requireUser();

  const before = await notionGetContact(contactId).catch(() => null);
  await notionUpdateContact(contactId, { businessStatus });

  await prisma.activity.create({
    data: {
      notionContactId: contactId,
      type: "STAGE_CHANGE",
      body: `Business status moved from "${before?.businessStatus ?? "neutral"}" to "${businessStatus}"`,
      createdById: user.id,
    },
  });

  revalidatePath("/contacts/pipeline");
  revalidatePath("/contacts");
  revalidatePath("/");
}

export async function deleteContact(contactId: string) {
  await requireUser();
  await archiveContact(contactId);
  redirect(`/contacts`);
}

export async function addContactNote(contactId: string, formData: FormData) {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await prisma.activity.create({
    data: { notionContactId: contactId, type: "NOTE", body, createdById: user.id },
  });

  redirect(`/contacts/${contactId}`);
}
