const NOTION_VERSION = "2022-06-28";
const NOTION_API = "https://api.notion.com/v1";

const CONTACTS_DB_ID = "dd1e9ad3-f630-490b-9509-18eeed1beaae";
const COMPANIES_DB_ID = "c1140ef4-39f3-40fc-bf88-2a903afed9ab";

function headers() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers as Record<string, string> | undefined) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ---- Property extraction helpers ----

type NotionPage = {
  id: string;
  properties: Record<string, unknown>;
  archived?: boolean;
};

function plainText(prop: unknown): string {
  const arr = (prop as { title?: unknown[]; rich_text?: unknown[] })?.title
    ?? (prop as { rich_text?: unknown[] })?.rich_text
    ?? [];
  return (arr as { plain_text: string }[]).map((t) => t.plain_text).join("");
}

function selectValue(prop: unknown): string | null {
  return (prop as { select?: { name: string } | null })?.select?.name ?? null;
}

function statusValue(prop: unknown): string | null {
  return (prop as { status?: { name: string } | null })?.status?.name ?? null;
}

function multiSelectValues(prop: unknown): string[] {
  return ((prop as { multi_select?: { name: string }[] })?.multi_select ?? []).map((o) => o.name);
}

function emailValue(prop: unknown): string | null {
  return (prop as { email?: string | null })?.email ?? null;
}

function phoneValue(prop: unknown): string | null {
  return (prop as { phone_number?: string | null })?.phone_number ?? null;
}

function relationIds(prop: unknown): string[] {
  return ((prop as { relation?: { id: string }[] })?.relation ?? []).map((r) => r.id);
}

function dateValue(prop: unknown): string | null {
  return (prop as { date?: { start: string } | null })?.date?.start ?? null;
}

// ---- Contacts ----

export type NotionContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nextAction: string | null;
  contactStatus: string | null;
  businessStatus: string | null;
  companyId: string | null;
  connectedOn: string | null;
};

function mapContact(page: NotionPage): NotionContact {
  const p = page.properties;
  return {
    id: page.id,
    name: plainText(p["Name"]) || "(no name)",
    email: emailValue(p["email"]),
    phone: phoneValue(p["Phone"]),
    nextAction: plainText(p["Next action"]) || null,
    contactStatus: statusValue(p["Contact Status"]),
    businessStatus: statusValue(p["Business status"]),
    companyId: relationIds(p["Company"])[0] ?? null,
    connectedOn: dateValue(p["Connected on"]),
  };
}

export async function listContacts(): Promise<NotionContact[]> {
  const contacts: NotionContact[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${CONTACTS_DB_ID}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    contacts.push(...(data.results as NotionPage[]).filter((p) => !p.archived).map(mapContact));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return contacts;
}

export async function getContact(pageId: string): Promise<NotionContact> {
  const page = await notionFetch(`/pages/${pageId}`);
  return mapContact(page as NotionPage);
}

export async function createContact(data: {
  name: string;
  email?: string;
  phone?: string;
  companyId?: string;
  connectedOn?: string;
}): Promise<NotionContact> {
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: data.name } }] },
  };
  if (data.email) properties["email"] = { email: data.email };
  if (data.phone) properties["Phone"] = { phone_number: data.phone };
  if (data.companyId) properties["Company"] = { relation: [{ id: data.companyId }] };
  if (data.connectedOn) properties["Connected on"] = { date: { start: data.connectedOn } };

  const page = await notionFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: CONTACTS_DB_ID }, properties }),
  });
  return mapContact(page as NotionPage);
}

export const BUSINESS_STATUS_VALUES = [
  "neutral",
  "considering the idea",
  "testing",
  "piloting in real workflow",
  "purchasing",
  "not interested",
] as const;

export async function updateContact(
  pageId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    companyId?: string | null;
    nextAction?: string;
    businessStatus?: string;
    connectedOn?: string;
  },
): Promise<NotionContact> {
  const properties: Record<string, unknown> = {};
  if (data.name !== undefined) properties["Name"] = { title: [{ text: { content: data.name } }] };
  if (data.email !== undefined) properties["email"] = { email: data.email || null };
  if (data.phone !== undefined) properties["Phone"] = { phone_number: data.phone || null };
  if (data.nextAction !== undefined) properties["Next action"] = { rich_text: [{ text: { content: data.nextAction } }] };
  if (data.companyId !== undefined) {
    properties["Company"] = { relation: data.companyId ? [{ id: data.companyId }] : [] };
  }
  if (data.businessStatus !== undefined) {
    properties["Business status"] = { status: { name: data.businessStatus } };
  }
  if (data.connectedOn !== undefined) {
    properties["Connected on"] = { date: { start: data.connectedOn } };
  }

  const page = await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
  return mapContact(page as NotionPage);
}

export async function archiveContact(pageId: string): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: true }),
  });
}

// ---- Companies ----

export const SEGMENT_OPTIONS = ["Recruiter", "Agency", "Corporate HR", "Career coach", "Professional", "Other", "?"] as const;

export type NotionCompany = {
  id: string;
  name: string;
  segment: string[];
};

function mapCompany(page: NotionPage): NotionCompany {
  const p = page.properties;
  return {
    id: page.id,
    name: plainText(p["Name"]) || "(unnamed company)",
    segment: multiSelectValues(p["Segment"]),
  };
}

export async function listCompanies(): Promise<NotionCompany[]> {
  const companies: NotionCompany[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${COMPANIES_DB_ID}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    companies.push(...(data.results as NotionPage[]).filter((p) => !p.archived).map(mapCompany));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return companies;
}

export async function getCompany(pageId: string): Promise<NotionCompany> {
  const page = await notionFetch(`/pages/${pageId}`);
  return mapCompany(page as NotionPage);
}

export async function createCompany(data: { name: string; segment?: string[] }): Promise<NotionCompany> {
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: data.name } }] },
  };
  if (data.segment?.length) properties["Segment"] = { multi_select: data.segment.map((s) => ({ name: s })) };

  const page = await notionFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: COMPANIES_DB_ID }, properties }),
  });
  return mapCompany(page as NotionPage);
}

export async function archiveCompany(pageId: string): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: true }),
  });
}
