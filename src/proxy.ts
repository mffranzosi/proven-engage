import { NextResponse } from "next/server";

// Auth is disabled — every request passes through. See src/lib/require-user.ts.
export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
