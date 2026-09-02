"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createDeal(formData: FormData) {
  const user = await requireUser();

  const title = String(formData.get("title") || "").trim();
  const contactId = String(formData.get("contactId") || "").trim();
  const valueRaw = String(formData.get("value") || "").trim();
  const engagementStageId = String(formData.get("engagementStageId") || "").trim();

  if (!title || !contactId || !engagementStageId) {
    throw new Error("Title, contact, and stage are required.");
  }

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new Error("Contact not found.");

  const deal = await prisma.deal.create({
    data: {
      title,
      contactId,
      companyId: contact.companyId,
      engagementStageId,
      value: valueRaw ? Number(valueRaw) : null,
    },
  });

  await prisma.activity.create({
    data: {
      contactId,
      type: "STAGE_CHANGE",
      body: `Deal "${title}" created`,
      createdById: user.id,
    },
  });

  redirect(`/deals`);
}

export async function moveDealStage(dealId: string, engagementStageId: string) {
  const user = await requireUser();

  const [deal, stage] = await Promise.all([
    prisma.deal.findUnique({ where: { id: dealId } }),
    prisma.stage.findUnique({ where: { id: engagementStageId } }),
  ]);
  if (!deal || !stage) throw new Error("Deal or stage not found.");

  await prisma.deal.update({ where: { id: dealId }, data: { engagementStageId } });

  await prisma.activity.create({
    data: {
      contactId: deal.contactId,
      type: "STAGE_CHANGE",
      body: `Deal "${deal.title}" moved to ${stage.name}`,
      createdById: user.id,
    },
  });

  revalidatePath("/deals");
}
