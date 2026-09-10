"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { requireAdmin, requireUser } from "@/lib/require-user";

export async function registerFirstAdmin(formData: FormData) {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    throw new Error("An account already exists. Ask an admin to invite you instead.");
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();

  if (!email || password.length < 8) {
    throw new Error("Email and a password of at least 8 characters are required.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { email, passwordHash, name, role: "ADMIN" },
  });

  await signIn("credentials", { email, password, redirectTo: "/" });
}

export async function createTeamMember(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const tempPassword = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!email || tempPassword.length < 8) {
    throw new Error("Email and a password of at least 8 characters are required.");
  }

  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.create({
    data: { email, passwordHash, name, role },
  });

  redirect("/settings/team");
}

export async function changePassword(formData: FormData) {
  const sessionUser = await requireUser();

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirmation don't match.");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  redirect("/settings/account?changed=1");
}
