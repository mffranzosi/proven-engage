import { prisma } from "@/lib/prisma";

export const DEFAULT_DAILY_SEND_LIMIT = 100;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// How many more emails `accountId` can send today, counting campaigns and
// sequences together (both share the same real-world Gmail sending limit).
export async function remainingSendQuota(accountId: string, dailyLimit: number | null): Promise<number> {
  const limit = dailyLimit ?? DEFAULT_DAILY_SEND_LIMIT;
  const since = startOfToday();

  const [campaignSentToday, sequenceSentToday] = await Promise.all([
    prisma.campaignContact.count({
      where: { campaign: { sendAsAccountId: accountId }, sentAt: { gte: since } },
    }),
    prisma.sequenceEnrollmentEvent.count({
      where: { type: "SENT", step: { sequence: { sendAsAccountId: accountId } }, occurredAt: { gte: since } },
    }),
  ]);

  return Math.max(0, limit - campaignSentToday - sequenceSentToday);
}
