import crypto from "crypto";

const UNLOCK_COOKIE = "engage_unlocked";
const PERSONA_COOKIE = "engage_persona";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function sign(value: string) {
  const secret = process.env.AUTH_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function unlockCookieValue() {
  return sign("unlocked");
}

export function isUnlocked(cookieValue: string | undefined) {
  return Boolean(cookieValue) && cookieValue === unlockCookieValue();
}

export function personaCookieValue(userId: string) {
  return `${userId}.${sign(userId)}`;
}

export function readPersonaUserId(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const [userId, signature] = cookieValue.split(".");
  if (!userId || !signature) return null;
  return signature === sign(userId) ? userId : null;
}

export const UNLOCK_COOKIE_NAME = UNLOCK_COOKIE;
export const PERSONA_COOKIE_NAME = PERSONA_COOKIE;
export const COOKIE_MAX_AGE = MAX_AGE;
