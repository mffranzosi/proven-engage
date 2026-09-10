import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function GET(req: NextRequest) {
  const user = await requireUser();

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || state !== user.id) {
    return NextResponse.redirect(new URL("/settings/accounts?gmail=error", req.nextUrl.origin));
  }

  const redirectUri = new URL("/api/gmail/callback", req.nextUrl.origin).toString();
  const { refreshToken, email } = await exchangeCodeForTokens(redirectUri, code);

  if (!refreshToken || !email) {
    return NextResponse.redirect(new URL("/settings/accounts?gmail=no_refresh_token", req.nextUrl.origin));
  }

  await prisma.connectedEmailAccount.upsert({
    where: { userId_email: { userId: user.id, email } },
    update: { refreshToken },
    create: { userId: user.id, email, refreshToken },
  });

  return NextResponse.redirect(new URL("/settings/accounts?gmail=connected", req.nextUrl.origin));
}
