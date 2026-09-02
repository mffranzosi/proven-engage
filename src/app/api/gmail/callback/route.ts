import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || state !== session.user.id) {
    return NextResponse.redirect(new URL("/campaigns?gmail=error", req.nextUrl.origin));
  }

  const redirectUri = new URL("/api/gmail/callback", req.nextUrl.origin).toString();
  const { refreshToken, email } = await exchangeCodeForTokens(redirectUri, code);

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/campaigns?gmail=no_refresh_token", req.nextUrl.origin));
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { googleRefreshToken: refreshToken, googleEmail: email },
  });

  return NextResponse.redirect(new URL("/campaigns?gmail=connected", req.nextUrl.origin));
}
