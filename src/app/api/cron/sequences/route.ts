import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getContact } from "@/lib/notion";
import { sendGmail, fillTemplate, bodyToHtml } from "@/lib/gmail";
import { remainingSendQuota } from "@/lib/send-quota";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const querySecret = req.nextUrl.searchParams.get("secret");
  return querySecret === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextSendAt: { lte: new Date() } },
    include: {
      currentStep: { include: { sequence: { include: { sendAsAccount: true } } } },
    },
  });

  const results: { enrollmentId: string; outcome: string }[] = [];
  const remainingQuotaByAccount = new Map<string, number>();

  for (const enrollment of due) {
    const step = enrollment.currentStep;
    const sender = step.sequence.sendAsAccount;

    if (!remainingQuotaByAccount.has(sender.id)) {
      remainingQuotaByAccount.set(sender.id, await remainingSendQuota(sender.id, sender.dailySendLimit));
    }
    if ((remainingQuotaByAccount.get(sender.id) ?? 0) <= 0) {
      results.push({ enrollmentId: enrollment.id, outcome: "skipped: daily send limit reached, will retry next run" });
      continue;
    }

    const contact = await getContact(enrollment.notionContactId).catch(() => null);
    if (!contact?.email) {
      results.push({ enrollmentId: enrollment.id, outcome: "skipped: contact has no email" });
      continue;
    }

    try {
      const html =
        fillTemplate(bodyToHtml(step.bodyTemplate), {
          firstName: contact.name.split(" ")[0] ?? contact.name,
          fullName: contact.name,
        }) + (sender.signatureHtml ? `<br />${sender.signatureHtml}` : "");

      const sent = await sendGmail({
        refreshToken: sender.refreshToken,
        from: sender.email,
        to: contact.email,
        subject: step.subject,
        html,
      });

      const nextStep = await prisma.sequenceStep.findUnique({
        where: { sequenceId_order: { sequenceId: step.sequenceId, order: step.order + 1 } },
      });

      await prisma.$transaction([
        prisma.sequenceEnrollmentEvent.create({
          data: {
            enrollmentId: enrollment.id,
            stepId: step.id,
            type: "SENT",
            gmailThreadId: sent.threadId,
            gmailMessageId: sent.id,
          },
        }),
        prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data:
            step.isTerminal || !nextStep
              ? { status: "COMPLETED" }
              : {
                  currentStepId: nextStep.id,
                  nextSendAt: new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000),
                },
        }),
      ]);

      remainingQuotaByAccount.set(sender.id, (remainingQuotaByAccount.get(sender.id) ?? 1) - 1);
      results.push({ enrollmentId: enrollment.id, outcome: "sent" });
    } catch (error) {
      console.error(`Sequence send failed for enrollment ${enrollment.id}`, error);
      results.push({ enrollmentId: enrollment.id, outcome: "error" });
    }
  }

  return NextResponse.json({ checked: due.length, results });
}
