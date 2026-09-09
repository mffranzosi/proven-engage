"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createList(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("List name is required.");

  const list = await prisma.contactList.create({ data: { name, createdById: user.id } });
  redirect(`/lists/${list.id}`);
}

export async function addContactsToList(listId: string, formData: FormData) {
  await requireUser();
  const contactIds = formData.getAll("contactIds").map(String);

  await prisma.contactListMember.createMany({
    data: contactIds.map((notionContactId) => ({ listId, notionContactId })),
    skipDuplicates: true,
  });

  revalidatePath(`/lists/${listId}`);
}

export async function removeContactFromList(listId: string, memberId: string) {
  await requireUser();
  await prisma.contactListMember.delete({ where: { id: memberId } });
  revalidatePath(`/lists/${listId}`);
}
