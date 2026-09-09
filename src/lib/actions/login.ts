"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginWithCredentials(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const remember = formData.get("remember") === "on" ? "true" : "false";

  try {
    await signIn("credentials", { email, password, remember, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error("Invalid email or password.");
    }
    throw error;
  }
}
