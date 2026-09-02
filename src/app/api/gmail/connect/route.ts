import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const redirectUri = new URL("/api/gmail/callback", req.nextUrl.origin).toString();
  const url = getGoogleAuthUrl(redirectUri, session.user.id);

  return NextResponse.redirect(url);
}
