"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendGmail, fillTemplate, bodyToHtml, checkThreadForReply } from "@/lib/gmail";
import { getContact } from "@/lib/notion";
import type { SendResult, TestSendResult } from "@/lib/send-result";

export async function createCampaign(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const bodyTemplate = String(formData.get("bodyTemplate") || "").trim();
  const sendAsAccountId = String(formData.get("sendAsAccountId") || "").trim();
  const contactIds = formData.getAll("contactIds").map(String);

  if (!name || !subject || !bodyTemplate) {
    throw new Error("Name, subject, and body are required.");
  }
  if (!sendAsAccountId) {
    throw new Error("Choose which connected account to send from.");
  }

  const account = await prisma.connectedEmailAccount.findFirst({
    where: { id: sendAsAccountId, userId: user.id },
  });
  if (!account) throw new Error("That connected account was not found.");

  const attachmentFiles = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  const MAX_ATTACHMENT_BYTES = 3.5 * 1024 * 1024;
  if (attachmentFiles.reduce((sum, f) => sum + f.size, 0) > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachments are too large: keep the total under 3.5MB.");
  }
  const attachments = await Promise.all(
    attachmentFiles.map(async (file) => ({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
    })),
  );

  const campaign = await prisma.campaign.create({
    data: {
      name,
      subject,
      bodyTemplate,
      createdById: user.id,
      sendAsAccountId: account.id,
      contacts: {
        create: contactIds.map((notionContactId) => ({ notionContactId })),
      },
      attachments: {
        create: attachments,
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

export async function updateCampaignSendAs(campaignId: string, formData: FormData) {
  const user = await requireUser();

  const sendAsAccountId = String(formData.get("sendAsAccountId") || "").trim();
  if (!sendAsAccountId) throw new Error("Choose which connected account to send from.");

  const account = await prisma.connectedEmailAccount.findFirst({
    where: { id: sendAsAccountId, userId: user.id },
  });
  if (!account) throw new Error("That connected account was not found.");

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { sendAsAccountId: account.id },
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function deleteCampaign(campaignId: string) {
  await requireUser();
  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/campaigns");
  redirect("/campaigns");
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

export async function sendCampaign(campaignId: string, _prev?: SendResult, _formData?: FormData): Promise<SendResult> {
  const user = await requireUser();
  const result = { sent: 0, noEmail: 0, failed: 0, firstError: null as string | null, stoppedEarly: false };
  let consecutiveFailures = 0;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contacts: { where: { status: "QUEUED" } }, sendAsAccount: true, attachments: true },
  });
  if (!campaign) throw new Error("Campaign not found.");

  const appUrl = process.env.APP_URL ?? "";
  const attachments = campaign.attachments.map((a) => ({ filename: a.filename, mimeType: a.mimeType, data: a.data }));

  for (const cc of campaign.contacts) {
    if (consecutiveFailures >= 3) {
      result.stoppedEarly = true;
      break;
    }
    const contact = await getContact(cc.notionContactId).catch(() => null);
    if (!contact?.email) {
      await prisma.campaignContact.update({ where: { id: cc.id }, data: { status: "BOUNCED" } });
      result.noEmail++;
      continue;
    }

    const html =
      fillTemplate(bodyToHtml(campaign.bodyTemplate), {
        firstName: contact.name.split(" ")[0] ?? contact.name,
        fullName: contact.name,
      }) +
      (campaign.sendAsAccount.signatureHtml ? `<br />${campaign.sendAsAccount.signatureHtml}` : "") +
      (appUrl ? `<img src="${appUrl}/api/track/open/${cc.id}" width="1" height="1" alt="" />` : "");

    try {
      const sent = await sendGmail({
        refreshToken: campaign.sendAsAccount.refreshToken,
        from: campaign.sendAsAccount.email,
        to: contact.email,
        subject: campaign.subject,
        html,
        attachments,
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
      result.sent++;
      consecutiveFailures = 0;
    } catch (error) {
      // Leave the contact QUEUED so the send can be retried once the cause is fixed.
      result.failed++;
      consecutiveFailures++;
      const message = error instanceof Error ? error.message : String(error);
      result.firstError ??= message;
      console.error(`Failed to send to ${contact.email}`, error);
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return result;
}

export async function sendTestEmail(
  campaignId: string,
  _prev?: TestSendResult,
  _formData?: FormData,
): Promise<TestSendResult> {
  const user = await requireUser();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { sendAsAccount: true, attachments: true },
  });
  if (!campaign) return { ok: false, message: "Campaign not found." };

  const fullName = user.name || user.email;
  const html =
    fillTemplate(bodyToHtml(campaign.bodyTemplate), { firstName: fullName.split(" ")[0] ?? fullName, fullName }) +
    (campaign.sendAsAccount.signatureHtml ? `<br />${campaign.sendAsAccount.signatureHtml}` : "");

  try {
    await sendGmail({
      refreshToken: campaign.sendAsAccount.refreshToken,
      from: campaign.sendAsAccount.email,
      to: user.email,
      subject: `[TEST] ${campaign.subject}`,
      html,
      attachments: campaign.attachments.map((a) => ({ filename: a.filename, mimeType: a.mimeType, data: a.data })),
    });
    return { ok: true, message: `Test sent to ${user.email}, from ${campaign.sendAsAccount.email}.` };
  } catch (error) {
    return { ok: false, message: `Test failed: ${error instanceof Error ? error.message : String(error)}` };
  }
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

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contacts: { where: { status: { in: ["SENT", "OPENED"] } } }, sendAsAccount: true },
  });
  if (!campaign) throw new Error("Campaign not found.");

  await checkRepliesForContacts(
    campaign.contacts.map((c) => ({ ...c, campaignId })),
    new Map([[campaignId, campaign.subject]]),
    campaign.sendAsAccount.refreshToken,
    user.id,
  );

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
}

export async function checkAllCampaignReplies() {
  const user = await requireUser();

  const campaigns = await prisma.campaign.findMany({
    where: { createdById: user.id },
    include: { contacts: { where: { status: { in: ["SENT", "OPENED"] } } }, sendAsAccount: true },
  });

  const campaignSubjectById = new Map(campaigns.map((c) => [c.id, c.subject]));

  for (const campaign of campaigns) {
    await checkRepliesForContacts(
      campaign.contacts.map((cc) => ({ ...cc, campaignId: campaign.id })),
      campaignSubjectById,
      campaign.sendAsAccount.refreshToken,
      user.id,
    );
  }

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
