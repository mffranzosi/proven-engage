"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendGmail, fillTemplate } from "@/lib/gmail";

export async function createCampaign(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const bodyTemplate = String(formData.get("bodyTemplate") || "").trim();
  const contactIds = formData.getAll("contactIds").map(String);

  if (!name || !subject || !bodyTemplate) {
    throw new Error("Name, subject, and body are required.");
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      subject,
      bodyTemplate,
      createdById: user.id,
      contacts: {
        create: contactIds.map((contactId) => ({ contactId })),
      },
    },
  });

  redirect(`/campaigns/${campaign.id}`);
}

export async function sendCampaign(campaignId: string) {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.googleRefreshToken || !dbUser.googleEmail) {
    throw new Error("Connect your Google account before sending.");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contacts: { where: { status: "QUEUED" }, include: { contact: true } } },
  });
  if (!campaign) throw new Error("Campaign not found.");

  const appUrl = process.env.APP_URL ?? "";

  for (const cc of campaign.contacts) {
    const html =
      fillTemplate(campaign.bodyTemplate, {
        firstName: cc.contact.name.split(" ")[0] ?? cc.contact.name,
        fullName: cc.contact.name,
      }) + (appUrl ? `<img src="${appUrl}/api/track/open/${cc.id}" width="1" height="1" alt="" />` : "");

    try {
      await sendGmail({
        refreshToken: dbUser.googleRefreshToken,
        from: dbUser.googleEmail,
        to: cc.contact.email,
        subject: campaign.subject,
        html,
      });

      await prisma.$transaction([
        prisma.campaignContact.update({
          where: { id: cc.id },
          data: { status: "SENT", sentAt: new Date() },
        }),
        prisma.activity.create({
          data: {
            contactId: cc.contactId,
            type: "EMAIL",
            body: `Sent campaign email: "${campaign.subject}"`,
            createdById: user.id,
          },
        }),
      ]);
    } catch (error) {
      await prisma.campaignContact.update({
        where: { id: cc.id },
        data: { status: "BOUNCED" },
      });
      console.error(`Failed to send to ${cc.contact.email}`, error);
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function markContactStatus(campaignContactId: string, status: "REPLIED") {
  await requireUser();
  const cc = await prisma.campaignContact.update({
    where: { id: campaignContactId },
    data: { status },
    include: { campaign: true },
  });
  revalidatePath(`/campaigns/${cc.campaignId}`);
}
