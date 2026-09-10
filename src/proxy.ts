import { NextRequest, NextResponse } from "next/server";
import { isUnlocked, readPersonaUserId, UNLOCK_COOKIE_NAME, PERSONA_COOKIE_NAME } from "@/lib/unlock";

const PUBLIC_PATHS = ["/unlock", "/api/cron", "/api/track", "/icon.svg"];
const PUBLIC_ASSET_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublicPath =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || PUBLIC_ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  if (isPublicPath) return NextResponse.next();

  const unlocked = isUnlocked(req.cookies.get(UNLOCK_COOKIE_NAME)?.value);
  if (!unlocked) {
    return NextResponse.redirect(new URL("/unlock", req.nextUrl.origin));
  }

  if (pathname === "/whoami") return NextResponse.next();

  const personaUserId = readPersonaUserId(req.cookies.get(PERSONA_COOKIE_NAME)?.value);
  if (!personaUserId) {
    return NextResponse.redirect(new URL("/whoami", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
