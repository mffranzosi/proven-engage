import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/gmail";
import { requireUser } from "@/lib/require-user";

export async function GET(req: NextRequest) {
  const user = await requireUser();

  const redirectUri = new URL("/api/gmail/callback", req.nextUrl.origin).toString();
  const url = getGoogleAuthUrl(redirectUri, user.id);

  return NextResponse.redirect(url);
}
