"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { unlockCookieValue, personaCookieValue, UNLOCK_COOKIE_NAME, PERSONA_COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/unlock";

export async function unlockApp(formData: FormData) {
  const password = String(formData.get("password") || "");
  const expected = (process.env.SHARED_PASSWORD || "").trim();

  console.log(
    `[unlock] provided.length=${password.length} expected.length=${expected.length} rawExpected.length=${(process.env.SHARED_PASSWORD || "").length} match=${password === expected}`,
  );

  if (password !== expected) {
    redirect("/unlock?error=1");
  }

  const jar = await cookies();
  jar.set(UNLOCK_COOKIE_NAME, unlockCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  redirect("/whoami");
}

export async function choosePersona(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/whoami?error=1");

  const jar = await cookies();
  jar.set(PERSONA_COOKIE_NAME, personaCookieValue(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  redirect("/");
}
