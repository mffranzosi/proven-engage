"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseLinkedInConnectionsCsv, parseLinkedInConnectionsXlsx } from "@/lib/linkedin-csv";
import { classifyRelevance, guessSegment } from "@/lib/relevance";
import {
  listContacts,
  listCompanies,
  createContact,
  createCompany,
  updateContact,
  type NotionContact,
} from "@/lib/notion";

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

export async function uploadLinkedInCsv(formData: FormData) {
  const user = await requireUser();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Choose a LinkedIn connections file first.");

  const isXlsx = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
  const rows = isXlsx
    ? parseLinkedInConnectionsXlsx(await file.arrayBuffer())
    : parseLinkedInConnectionsCsv(await file.text());

  const memory = await prisma.linkedInContactMemory.findMany({
    where: { profileUrl: { in: rows.map((r) => r.profileUrl) } },
  });
  const memoryByUrl = new Map(memory.map((m) => [m.profileUrl, m]));

  const newOrChanged = rows.filter((row) => {
    const prev = memoryByUrl.get(row.profileUrl);
    if (!prev) return true;
    return (
      normalize(prev.lastEmail) !== normalize(row.email) ||
      normalize(prev.lastCompany) !== normalize(row.company) ||
      normalize(prev.lastPosition) !== normalize(row.position)
    );
  });

  if (newOrChanged.length === 0) {
    throw new Error("No new or changed connections since your last import — nothing to review.");
  }

  const classifications = classifyRelevance(
    newOrChanged.map((r) => ({
      key: r.profileUrl,
      firstName: r.firstName,
      lastName: r.lastName,
      position: r.position,
      company: r.company,
    })),
  );
  const cohortByKey = new Map(classifications.map((c) => [c.key, c]));

  const linkedinImport = await prisma.linkedInImport.create({
    data: {
      createdById: user.id,
      status: "TRIAGE",
      items: {
        create: newOrChanged.map((row) => {
          const cohort = cohortByKey.get(row.profileUrl)?.cohort ?? "UNCERTAIN";
          return {
            profileUrl: row.profileUrl,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            company: row.company,
            position: row.position,
            connectedOn: row.connectedOn,
            aiCohort: cohort,
            // Seeded live so the triage checkboxes have something real to reflect/toggle
            // from the moment the page renders — not just a UI default.
            selectedForCrm: cohort === "PERFECT_MATCH",
          };
        }),
      },
    },
  });

  redirect(`/contacts/import/${linkedinImport.id}`);
}

// Fires on every checkbox toggle in the triage step — saved immediately so an
// interrupted review session doesn't lose progress.
export async function setItemSelected(itemId: string, selected: boolean) {
  await requireUser();
  const item = await prisma.linkedInImportItem.update({ where: { id: itemId }, data: { selectedForCrm: selected } });
  revalidatePath(`/contacts/import/${item.importId}`);
}

function findNotionMatch(
  contacts: NotionContact[],
  item: { email: string | null; firstName: string; lastName: string; company: string | null },
): { id: string; name: string; confidence: "email" | "name" } | null {
  if (item.email) {
    const byEmail = contacts.find((c) => c.email && normalize(c.email) === normalize(item.email));
    if (byEmail) return { id: byEmail.id, name: byEmail.name, confidence: "email" };
  }

  const fullName = normalize(`${item.firstName} ${item.lastName}`);
  const byName = contacts.find((c) => normalize(c.name) === fullName);
  if (byName) return { id: byName.id, name: byName.name, confidence: "name" };

  return null;
}

// Moves the import from TRIAGE to DEDUP: reads whatever selection state is already
// saved (no form to submit — every checkbox already persisted itself), computes CRM
// matches for the selected people, and seeds a sensible draft decision per person.
export async function confirmTriage(importId: string) {
  await requireUser();

  const items = await prisma.linkedInImportItem.findMany({ where: { importId } });
  const contacts = await listContacts();

  for (const item of items) {
    if (!item.selectedForCrm) {
      await prisma.linkedInContactMemory.upsert({
        where: { profileUrl: item.profileUrl },
        create: {
          profileUrl: item.profileUrl,
          lastFirstName: item.firstName,
          lastLastName: item.lastName,
          lastEmail: item.email,
          lastCompany: item.company,
          lastPosition: item.position,
          included: false,
        },
        update: {
          lastFirstName: item.firstName,
          lastLastName: item.lastName,
          lastEmail: item.email,
          lastCompany: item.company,
          lastPosition: item.position,
          included: false,
          notionContactId: null,
        },
      });
      continue;
    }

    const match = findNotionMatch(contacts, item);
    await prisma.linkedInImportItem.update({
      where: { id: item.id },
      data: {
        matchedNotionContactId: match?.id ?? null,
        matchedContactName: match?.name ?? null,
        matchConfidence: match?.confidence ?? "none",
        // matchDecision is deliberately left null (not defaulted) — nothing is
        // considered "reviewed" until Marco explicitly picks something, individually
        // or via the bulk-accept button. Apply to CRM only ever touches decided rows.
        draftSegment: guessSegment({ position: item.position, company: item.company }),
      },
    });
  }

  await prisma.linkedInImport.update({ where: { id: importId }, data: { status: "DEDUP" } });
  revalidatePath(`/contacts/import/${importId}`);
}

// Fires on every radio/select/checkbox change in the dedup step.
export async function setItemDecision(itemId: string, decision: "create_new" | "merge" | "skip") {
  await requireUser();
  const item = await prisma.linkedInImportItem.update({
    where: { id: itemId },
    data: { matchDecision: decision === "create_new" ? "CREATE_NEW" : decision === "merge" ? "MERGE_INTO_EXISTING" : "SKIP" },
  });
  revalidatePath(`/contacts/import/${item.importId}`);
}

// Deliberate one-click "accept the default for everyone still undecided in this
// group" — only ever wired up in the UI for the "no match found" tier, where
// there's no existing contact at risk of being overwritten by mistake.
export async function setBulkDecision(importId: string, confidence: string, decision: "create_new" | "merge" | "skip") {
  await requireUser();
  await prisma.linkedInImportItem.updateMany({
    where: { importId, selectedForCrm: true, matchConfidence: confidence, matchDecision: null },
    data: { matchDecision: decision === "create_new" ? "CREATE_NEW" : decision === "merge" ? "MERGE_INTO_EXISTING" : "SKIP" },
  });
  revalidatePath(`/contacts/import/${importId}`);
}

export async function setItemEnrichEmail(itemId: string, enrich: boolean) {
  await requireUser();
  await prisma.linkedInImportItem.update({ where: { id: itemId }, data: { enrichEmail: enrich } });
}

export async function setItemSegment(itemId: string, segment: string) {
  await requireUser();
  await prisma.linkedInImportItem.update({ where: { id: itemId }, data: { draftSegment: segment } });
}

// The only step that actually writes to Notion. Only touches rows Marco has
// explicitly decided on (matchDecision set) and not already applied — anything
// still undecided is left completely alone, ready for a future review session.
export async function confirmImport(importId: string) {
  const user = await requireUser();

  const items = await prisma.linkedInImportItem.findMany({
    where: { importId, selectedForCrm: true, matchDecision: { not: null }, appliedAt: null },
  });

  const companies = await listCompanies();

  for (const item of items) {
    const decision = item.matchDecision === "MERGE_INTO_EXISTING" ? "merge" : item.matchDecision === "SKIP" ? "skip" : "create_new";

    let resultingNotionContactId: string | null = null;

    if (decision === "create_new") {
      let companyId: string | undefined;
      if (item.company) {
        const existingCompany = companies.find((c) => normalize(c.name) === normalize(item.company));
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const segment = item.draftSegment ?? guessSegment({ position: item.position, company: item.company });
          const created = await createCompany({ name: item.company, segment: segment ? [segment] : undefined });
          companies.push(created);
          companyId = created.id;
        }
      }

      const created = await createContact({
        name: `${item.firstName} ${item.lastName}`.trim(),
        email: item.email ?? undefined,
        companyId,
        connectedOn: item.connectedOn?.toISOString().slice(0, 10),
      });
      resultingNotionContactId = created.id;
    } else if (decision === "merge" && item.matchedNotionContactId) {
      await updateContact(item.matchedNotionContactId, {
        ...(item.enrichEmail && item.email ? { email: item.email } : {}),
        connectedOn: item.connectedOn?.toISOString().slice(0, 10),
      });
      resultingNotionContactId = item.matchedNotionContactId;
    }

    await prisma.$transaction([
      prisma.linkedInImportItem.update({
        where: { id: item.id },
        data: { resultingNotionContactId, appliedAt: new Date() },
      }),
      prisma.linkedInContactMemory.upsert({
        where: { profileUrl: item.profileUrl },
        create: {
          profileUrl: item.profileUrl,
          lastFirstName: item.firstName,
          lastLastName: item.lastName,
          lastEmail: item.email,
          lastCompany: item.company,
          lastPosition: item.position,
          included: decision !== "skip",
          notionContactId: resultingNotionContactId,
        },
        update: {
          lastFirstName: item.firstName,
          lastLastName: item.lastName,
          lastEmail: item.email,
          lastCompany: item.company,
          lastPosition: item.position,
          included: decision !== "skip",
          notionContactId: resultingNotionContactId,
        },
      }),
    ]);
  }

  const stillPending = await prisma.linkedInImportItem.count({
    where: { importId, selectedForCrm: true, matchDecision: null },
  });
  if (stillPending === 0) {
    await prisma.linkedInImport.update({ where: { id: importId }, data: { status: "DONE" } });
  }
  void user;
  revalidatePath(`/contacts/import/${importId}`);
  redirect(`/contacts/import/${importId}`);
}
