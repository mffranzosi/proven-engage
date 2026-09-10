"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { revalidatePath } from "next/cache";

export async function disconnectAccount(accountId: string) {
  const user = await requireUser();

  const account = await prisma.connectedEmailAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!account) throw new Error("Account not found.");

  const [campaignCount, sequenceCount] = await Promise.all([
    prisma.campaign.count({ where: { sendAsAccountId: accountId } }),
    prisma.sequence.count({ where: { sendAsAccountId: accountId } }),
  ]);
  if (campaignCount > 0 || sequenceCount > 0) {
    throw new Error("This account is still used by a campaign or sequence — it can't be disconnected.");
  }

  await prisma.connectedEmailAccount.delete({ where: { id: accountId } });
  revalidatePath("/settings/accounts");
}
