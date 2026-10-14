"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { revalidatePath } from "next/cache";

export async function disconnectAccount(accountId: string, _prevState: { error: string } | null) {
  const user = await requireUser();

  const account = await prisma.connectedEmailAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!account) return { error: "Account not found." };

  const [campaignCount, sequenceCount] = await Promise.all([
    prisma.campaign.count({ where: { sendAsAccountId: accountId } }),
    prisma.sequence.count({ where: { sendAsAccountId: accountId } }),
  ]);
  if (campaignCount > 0 || sequenceCount > 0) {
    return { error: "This account is still used by a campaign or sequence — it can't be disconnected." };
  }

  await prisma.connectedEmailAccount.delete({ where: { id: accountId } });
  revalidatePath("/settings/accounts");
  return { error: "" };
}

export async function updateAccountSignature(accountId: string, formData: FormData) {
  const user = await requireUser();

  const account = await prisma.connectedEmailAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!account) throw new Error("Account not found.");

  const signatureHtml = String(formData.get("signatureHtml") || "").trim();

  await prisma.connectedEmailAccount.update({
    where: { id: accountId },
    data: { signatureHtml: signatureHtml || null },
  });

  revalidatePath("/settings/accounts");
}

export async function updateDailySendLimit(accountId: string, formData: FormData) {
  const user = await requireUser();

  const account = await prisma.connectedEmailAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!account) throw new Error("Account not found.");

  const raw = String(formData.get("dailySendLimit") || "").trim();
  const dailySendLimit = raw ? Math.max(1, Math.round(Number(raw))) : null;
  if (raw && !Number.isFinite(dailySendLimit)) throw new Error("Daily send limit must be a number.");

  await prisma.connectedEmailAccount.update({
    where: { id: accountId },
    data: { dailySendLimit },
  });

  revalidatePath("/settings/accounts");
}
