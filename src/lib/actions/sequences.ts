"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkThreadForReply } from "@/lib/gmail";

export async function createSequence(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const sendAsAccountId = String(formData.get("sendAsAccountId") || "").trim();
  if (!name) throw new Error("Sequence name is required.");
  if (!sendAsAccountId) throw new Error("Choose which connected account to send from.");

  const account = await prisma.connectedEmailAccount.findFirst({
    where: { id: sendAsAccountId, userId: user.id },
  });
  if (!account) throw new Error("That connected account was not found.");

  const sequence = await prisma.sequence.create({
    data: { name, createdById: user.id, sendAsAccountId: account.id },
  });
  redirect(`/sequences/${sequence.id}`);
}

export async function addStep(sequenceId: string, formData: FormData) {
  await requireUser();

  const subject = String(formData.get("subject") || "").trim();
  const bodyTemplate = String(formData.get("bodyTemplate") || "").trim();
  const delayDays = Number(formData.get("delayDays") || 0);
  const isTerminal = formData.get("isTerminal") === "on";

  if (!subject || !bodyTemplate) throw new Error("Subject and body are required.");
  if (!Number.isFinite(delayDays) || delayDays < 0) throw new Error("Delay must be zero or a positive number of days.");

  const lastStep = await prisma.sequenceStep.findFirst({
    where: { sequenceId },
    orderBy: { order: "desc" },
  });

  await prisma.sequenceStep.create({
    data: {
      sequenceId,
      order: (lastStep?.order ?? -1) + 1,
      subject,
      bodyTemplate,
      delayDays,
      isTerminal,
    },
  });

  revalidatePath(`/sequences/${sequenceId}`);
}

export async function addBranchOption(sequenceId: string, fromStepId: string, formData: FormData) {
  await requireUser();

  const label = String(formData.get("label") || "").trim();
  const nextStepId = String(formData.get("nextStepId") || "").trim();

  if (!label || !nextStepId) throw new Error("Label and target step are required.");

  await prisma.sequenceBranchOption.create({
    data: { fromStepId, label, nextStepId },
  });

  revalidatePath(`/sequences/${sequenceId}`);
}

export async function enrollContact(sequenceId: string, formData: FormData) {
  await requireUser();

  const notionContactId = String(formData.get("contactId") || "").trim();
  if (!notionContactId) throw new Error("Choose a contact.");

  const firstStep = await prisma.sequenceStep.findFirst({
    where: { sequenceId },
    orderBy: { order: "asc" },
  });
  if (!firstStep) throw new Error("Add at least one step before enrolling contacts.");

  await prisma.sequenceEnrollment.upsert({
    where: { sequenceId_notionContactId: { sequenceId, notionContactId } },
    update: {},
    create: {
      sequenceId,
      notionContactId,
      currentStepId: firstStep.id,
      nextSendAt: new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath(`/sequences/${sequenceId}`);
}

export async function enrollList(sequenceId: string, formData: FormData) {
  await requireUser();

  const listId = String(formData.get("listId") || "").trim();
  if (!listId) throw new Error("Choose a list.");

  const [firstStep, members] = await Promise.all([
    prisma.sequenceStep.findFirst({ where: { sequenceId }, orderBy: { order: "asc" } }),
    prisma.contactListMember.findMany({ where: { listId } }),
  ]);
  if (!firstStep) throw new Error("Add at least one step before enrolling contacts.");

  const nextSendAt = new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000);

  await prisma.sequenceEnrollment.createMany({
    data: members.map((m) => ({
      sequenceId,
      notionContactId: m.notionContactId,
      currentStepId: firstStep.id,
      nextSendAt,
    })),
    skipDuplicates: true,
  });

  revalidatePath(`/sequences/${sequenceId}`);
}

export async function selectBranch(sequenceId: string, enrollmentId: string, formData: FormData) {
  const user = await requireUser();

  const branchOptionId = String(formData.get("branchOptionId") || "").trim();
  if (!branchOptionId) return;

  const branch = await prisma.sequenceBranchOption.findUnique({ where: { id: branchOptionId } });
  if (!branch) throw new Error("Branch option not found.");

  const enrollment = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) throw new Error("Enrollment not found.");

  await prisma.$transaction([
    prisma.sequenceEnrollmentEvent.create({
      data: {
        enrollmentId,
        stepId: enrollment.currentStepId,
        type: "BRANCH_SELECTED",
        branchOptionId,
      },
    }),
    prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStepId: branch.nextStepId, nextSendAt: new Date(), status: "ACTIVE" },
    }),
    prisma.activity.create({
      data: {
        notionContactId: enrollment.notionContactId,
        type: "EMAIL",
        body: `Sequence branch selected: "${branch.label}"`,
        createdById: user.id,
      },
    }),
  ]);

  revalidatePath(`/sequences/${sequenceId}`);
}

export async function checkEnrollmentReply(sequenceId: string, enrollmentId: string) {
  const user = await requireUser();

  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      sequence: { include: { sendAsAccount: true } },
      events: { where: { type: "SENT" }, orderBy: { occurredAt: "desc" }, take: 1 },
    },
  });
  if (!enrollment) throw new Error("Enrollment not found.");

  const lastSent = enrollment.events[0];
  if (!lastSent?.gmailThreadId) return;

  const reply = await checkThreadForReply({
    refreshToken: enrollment.sequence.sendAsAccount.refreshToken,
    threadId: lastSent.gmailThreadId,
    ourMessageId: lastSent.gmailMessageId,
  }).catch(() => null);

  if (reply) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { lastReplySnippet: reply.snippet, lastRepliedAt: reply.receivedAt },
    });
  }

  revalidatePath(`/sequences/${sequenceId}`);
}
