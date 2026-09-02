import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email"];

function getOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

export function getGoogleAuthUrl(redirectUri: string, state: string) {
  const client = getOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(redirectUri: string, code: string) {
  const client = getOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data } = await oauth2.userinfo.get();

  return { refreshToken: tokens.refresh_token, email: data.email ?? null };
}

function encodeSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
}

export async function sendGmail({
  refreshToken,
  from,
  to,
  subject,
  html,
}: {
  refreshToken: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const client = getOAuthClient(process.env.APP_URL ? `${process.env.APP_URL}/api/gmail/callback` : "");
  client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: client });

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  const raw = Buffer.from(message).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

export function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
