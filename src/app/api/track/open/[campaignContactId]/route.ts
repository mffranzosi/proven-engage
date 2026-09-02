import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64",
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ campaignContactId: string }> }) {
  const { campaignContactId } = await params;

  try {
    await prisma.campaignContact.updateMany({
      where: { id: campaignContactId, status: "SENT" },
      data: { status: "OPENED", openedAt: new Date() },
    });
  } catch {
    // Tracking must never break the pixel response.
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  });
}
