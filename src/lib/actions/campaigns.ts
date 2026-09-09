"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendGmail, fillTemplate, checkThreadForReply } from "@/lib/gmail";
import { getContact } from "@/lib/notion";

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
        create: contactIds.map((notionContactId) => ({ notionContactId })),
      },
    },
  });

  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaign(campaignId: string, formData: FormData) {
  await requireUser();

  const existing = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contacts: true },
  });
  if (!existing) throw new Error("Campaign not found.");
  if (existing.contacts.some((c) => c.status !== "QUEUED")) {
    throw new Error("This campaign has already started sending and can no longer be edited.");
  }

  const name = String(formData.get("name") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const bodyTemplate = String(formData.get("bodyTemplate") || "").trim();

  if (!name || !subject || !bodyTemplate) {
    throw new Error("Name, subject, and body are required.");
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { name, subject, bodyTemplate },
  });

  redirect(`/campaigns/${campaignId}`);
}

export async function addContactsToCampaign(campaignId: string, formData: FormData) {
  await requireUser();
  const contactIds = formData.getAll("contactIds").map(String);

  await prisma.campaignContact.createMany({
    data: contactIds.map((notionContactId) => ({ campaignId, notionContactId })),
    skipDuplicates: true,
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function sendCampaign(campaignId: string) {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.googleRefreshToken || !dbUser.googleEmail) {
    throw new Error("Connect your Google account before sending.");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contacts: { where: { status: "QUEUED" } } },
  });
  if (!campaign) throw new Error("Campaign not found.");

  const appUrl = process.env.APP_URL ?? "";

  for (const cc of campaign.contacts) {
    const contact = await getContact(cc.notionContactId).catch(() => null);
    if (!contact?.email) {
      await prisma.campaignContact.update({ where: { id: cc.id }, data: { status: "BOUNCED" } });
      continue;
    }

    const html =
      fillTemplate(campaign.bodyTemplate, {
        firstName: contact.name.split(" ")[0] ?? contact.name,
        fullName: contact.name,
      }) + (appUrl ? `<img src="${appUrl}/api/track/open/${cc.id}" width="1" height="1" alt="" />` : "");

    try {
      const sent = await sendGmail({
        refreshToken: dbUser.googleRefreshToken,
        from: dbUser.googleEmail,
        to: contact.email,
        subject: campaign.subject,
        html,
      });

      await prisma.$transaction([
        prisma.campaignContact.update({
          where: { id: cc.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            gmailThreadId: sent.threadId,
            gmailMessageId: sent.id,
          },
        }),
        prisma.activity.create({
          data: {
            notionContactId: cc.notionContactId,
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
      console.error(`Failed to send to ${contact.email}`, error);
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

async function checkRepliesForContacts(
  contacts: { id: string; notionContactId: string; gmailThreadId: string | null; gmailMessageId: string | null; campaignId: string }[],
  campaignSubjectById: Map<string, string>,
  refreshToken: string,
  userId: string,
) {
  for (const cc of contacts) {
    if (!cc.gmailThreadId) continue;

    const reply = await checkThreadForReply({
      refreshToken,
      threadId: cc.gmailThreadId,
      ourMessageId: cc.gmailMessageId,
    }).catch(() => null);

    if (!reply) continue;

    await prisma.$transaction([
      prisma.campaignContact.update({
        where: { id: cc.id },
        data: { status: "REPLIED", replySnippet: reply.snippet, repliedAt: reply.receivedAt },
      }),
      prisma.activity.create({
        data: {
          notionContactId: cc.notionContactId,
          type: "EMAIL",
          body: `Replied to campaign email: "${campaignSubjectById.get(cc.campaignId) ?? ""}"`,
          createdById: userId,
        },
      }),
    ]);
  }
}

export async function checkCampaignReplies(campaignId: string) {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.googleRefreshToken) throw new Error("Connect your Google account first.");

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contacts: { where: { status: { in: ["SENT", "OPENED"] } } } },
  });
  if (!campaign) throw new Error("Campaign not found.");

  await checkRepliesForContacts(
    campaign.contacts.map((c) => ({ ...c, campaignId })),
    new Map([[campaignId, campaign.subject]]),
    dbUser.googleRefreshToken,
    user.id,
  );

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
}

export async function checkAllCampaignReplies() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.googleRefreshToken) throw new Error("Connect your Google account first.");

  const campaigns = await prisma.campaign.findMany({
    where: { createdById: user.id },
    include: { contacts: { where: { status: { in: ["SENT", "OPENED"] } } } },
  });

  const campaignSubjectById = new Map(campaigns.map((c) => [c.id, c.subject]));
  const allContacts = campaigns.flatMap((c) => c.contacts.map((cc) => ({ ...cc, campaignId: c.id })));

  await checkRepliesForContacts(allContacts, campaignSubjectById, dbUser.googleRefreshToken, user.id);

  revalidatePath("/campaigns");
  revalidatePath("/");
}

export async function acknowledgeReply(campaignContactId: string) {
  await requireUser();
  const cc = await prisma.campaignContact.update({
    where: { id: campaignContactId },
    data: { repliedAcknowledgedAt: new Date() },
  });
  revalidatePath(`/campaigns/${cc.campaignId}`);
  revalidatePath("/");
}
