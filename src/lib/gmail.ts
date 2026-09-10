import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

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
  attachments,
}: {
  refreshToken: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; mimeType: string; data: string }[];
}) {
  const client = getOAuthClient(process.env.APP_URL ? `${process.env.APP_URL}/api/gmail/callback` : "");
  client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: client });

  const headers = [`From: ${from}`, `To: ${to}`, `Subject: ${encodeSubject(subject)}`, "MIME-Version: 1.0"];

  let message: string;
  if (attachments && attachments.length > 0) {
    const boundary = `mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const parts = [
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
      "",
      ...attachments.flatMap((att) => [
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        "Content-Transfer-Encoding: base64",
        "",
        att.data,
        "",
      ]),
      `--${boundary}--`,
    ];

    message = [...headers, `Content-Type: multipart/mixed; boundary="${boundary}"`, "", ...parts].join("\r\n");
  } else {
    message = [...headers, "Content-Type: text/html; charset=UTF-8", "", html].join("\r\n");
  }

  const raw = Buffer.from(message).toString("base64url");

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return { id: data.id ?? null, threadId: data.threadId ?? null };
}

export function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function checkThreadForReply({
  refreshToken,
  threadId,
  ourMessageId,
}: {
  refreshToken: string;
  threadId: string;
  ourMessageId: string | null;
}): Promise<{ snippet: string; receivedAt: Date } | null> {
  const client = getOAuthClient(process.env.APP_URL ? `${process.env.APP_URL}/api/gmail/callback` : "");
  client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: client });

  const { data } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["Date"],
  });

  const messages = data.messages ?? [];
  const ourIndex = ourMessageId ? messages.findIndex((m) => m.id === ourMessageId) : 0;
  const laterMessages = messages.slice(ourIndex + 1);
  const reply = laterMessages.find((m) => !(m.labelIds ?? []).includes("SENT"));

  if (!reply) return null;

  const dateHeader = reply.payload?.headers?.find((h) => h.name === "Date")?.value;

  return {
    snippet: reply.snippet ?? "",
    receivedAt: dateHeader ? new Date(dateHeader) : new Date(),
  };
}
