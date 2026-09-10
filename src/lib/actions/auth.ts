"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-user";

export async function createTeamMember(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!email) {
    throw new Error("Email is required.");
  }

  // Unused for real auth — ENGAGE now gates on a shared password + a persona picker,
  // not per-user login. This just satisfies the column's NOT NULL constraint.
  const passwordHash = crypto.randomBytes(32).toString("hex");

  await prisma.user.create({
    data: { email, passwordHash, name, role },
  });

  redirect("/settings/team");
}
