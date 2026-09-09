import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { confirmTriage, confirmImport } from "@/lib/actions/linkedin-import";
import { guessSegment } from "@/lib/relevance";
import { SEGMENT_OPTIONS } from "@/lib/notion";
import { PaginatedList } from "@/components/paginated-list";
import { TriageCheckbox, DecisionRadios, BulkAcceptButton, EnrichEmailCheckbox, SegmentSelect } from "@/components/linkedin-import-controls";

export const dynamic = "force-dynamic";

const COHORT_LABEL: Record<string, string> = {
  PERFECT_MATCH: "Perfect match",
  UNCERTAIN: "Uncertain",
  NOT_FOR_PROVEN: "Not for PROVEN",
};

export default async function LinkedInImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const linkedinImport = await prisma.linkedInImport.findUnique({
    where: { id },
    include: { items: { orderBy: [{ aiCohort: "asc" }, { lastName: "asc" }] } },
  });

  if (!linkedinImport) notFound();

  const confirmTriageWithId = confirmTriage.bind(null, linkedinImport.id);
  const confirmImportWithId = confirmImport.bind(null, linkedinImport.id);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/contacts/import" className="text-sm text-neutral-500 hover:underline">
          ← Imports
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
          LinkedIn import — {linkedinImport.createdAt.toLocaleDateString()}
        </h1>
      </div>

      {linkedinImport.status === "TRIAGE" ? (
        <TriageStep items={linkedinImport.items} formAction={confirmTriageWithId} />
      ) : null}

      {linkedinImport.status === "DEDUP" ? (
        <DedupStep
          importId={linkedinImport.id}
          items={linkedinImport.items.filter((i) => i.selectedForCrm)}
          formAction={confirmImportWithId}
        />
      ) : null}

      {linkedinImport.status === "DONE" ? <DoneStep items={linkedinImport.items} /> : null}
    </div>
  );
}

type ImportItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  position: string | null;
  aiCohort: string;
  selectedForCrm: boolean | null;
  matchedContactName: string | null;
  matchConfidence: string | null;
  matchDecision: string | null;
  enrichEmail: boolean;
  draftSegment: string | null;
  resultingNotionContactId: string | null;
  appliedAt: Date | null;
};

function TriageStep({ items, formAction }: { items: ImportItem[]; formAction: () => Promise<void> }) {
  const cohorts: ImportItem["aiCohort"][] = ["PERFECT_MATCH", "UNCERTAIN", "NOT_FOR_PROVEN"];

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        These have been sorted into three groups based on keywords in job title and company. Every
        checkbox saves as soon as you toggle it — safe to stop and come back later. Nothing is added
        to the CRM until you continue past this step.
      </p>
      {cohorts.map((cohort) => {
        const cohortItems = items.filter((i) => i.aiCohort === cohort);
        if (cohortItems.length === 0) return null;
        return (
          <div key={cohort} className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-neutral-900">
              {COHORT_LABEL[cohort]} ({cohortItems.length})
            </h2>
            <p className="mb-3 text-xs text-neutral-400">
              {cohort === "PERFECT_MATCH"
                ? "Pre-selected — uncheck anyone that isn't actually a fit."
                : cohort === "NOT_FOR_PROVEN"
                  ? "Not pre-selected — check anyone you'd want to include anyway."
                  : "Nothing pre-selected — check only the ones to include."}
            </p>
            <PaginatedList>
              {cohortItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <TriageCheckbox itemId={item.id} defaultChecked={Boolean(item.selectedForCrm)} />
                  <span>
                    <span className="font-medium text-neutral-900">
                      {item.firstName} {item.lastName}
                    </span>{" "}
                    <span className="text-neutral-500">
                      — {item.position ?? "unknown role"} {item.company ? `at ${item.company}` : ""}
                    </span>
                  </span>
                </div>
              ))}
            </PaginatedList>
          </div>
        );
      })}
      <form action={formAction}>
        <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
          Continue to CRM match review
        </button>
      </form>
    </div>
  );
}

const MATCH_TIER = [
  { confidence: "email", title: "Sure match", hint: "Matched by email — almost certainly the same person." },
  { confidence: "name", title: "Unsure", hint: "Matched by name only — could be a different person with the same name." },
  { confidence: "none", title: "Not a match", hint: "Nobody like this found in the CRM — will be added as new." },
] as const;

function DedupStep({
  importId,
  items,
  formAction,
}: {
  importId: string;
  items: ImportItem[];
  formAction: () => Promise<void>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">Nobody was selected in the previous step.</p>;
  }

  const pendingCount = items.filter((i) => !i.appliedAt && i.matchDecision === null).length;
  const readyCount = items.filter((i) => !i.appliedAt && i.matchDecision !== null).length;

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        For each person, confirm whether they&apos;re already in the CRM. Every choice saves as soon
        as you make it — safe to stop and come back later. <strong>Apply to CRM only ever touches
        people you&apos;ve actually decided on</strong> — anyone still marked &ldquo;not yet
        reviewed&rdquo; is left alone, ready for next time.
      </p>
      {MATCH_TIER.map((tier) => {
        const tierItems = items.filter((i) => (i.matchConfidence ?? "none") === tier.confidence);
        if (tierItems.length === 0) return null;
        const tierPending = tierItems.filter((i) => !i.appliedAt && i.matchDecision === null).length;

        return (
          <div key={tier.confidence} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  {tier.title} ({tierItems.length})
                </h2>
                <p className="text-xs text-neutral-400">{tier.hint}</p>
              </div>
              {tier.confidence === "none" && tierPending > 0 ? (
                <BulkAcceptButton
                  importId={importId}
                  confidence={tier.confidence}
                  decision="create_new"
                  label={`Add all ${tierPending} remaining as new contacts`}
                />
              ) : null}
            </div>
            <PaginatedList itemSpacing="space-y-3">
              {tierItems.map((item) => (
                <DedupRow key={item.id} item={item} />
              ))}
            </PaginatedList>
          </div>
        );
      })}
      <div className="flex items-center gap-4">
        <form action={formAction}>
          <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Apply to CRM
          </button>
        </form>
        <p className="text-xs text-neutral-500">
          {readyCount} ready to apply · {pendingCount} still not yet reviewed
        </p>
      </div>
    </div>
  );
}

function DedupRow({ item }: { item: ImportItem }) {
  const suggestedSegment = item.draftSegment ?? guessSegment({ position: item.position, company: item.company });

  if (item.appliedAt) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
        <span className="font-medium text-neutral-700">
          {item.firstName} {item.lastName}
        </span>{" "}
        — already applied ({item.matchDecision === "MERGE_INTO_EXISTING" ? "updated existing contact" : item.matchDecision === "SKIP" ? "skipped" : "added as new"})
      </div>
    );
  }

  const currentDecision =
    item.matchDecision === "MERGE_INTO_EXISTING"
      ? "merge"
      : item.matchDecision === "CREATE_NEW"
        ? "create_new"
        : item.matchDecision === "SKIP"
          ? "skip"
          : null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 text-sm font-medium text-neutral-900">
        {item.firstName} {item.lastName}{" "}
        <span className="font-normal text-neutral-500">
          — {item.position ?? "unknown role"} {item.company ? `at ${item.company}` : ""}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <DecisionRadios itemId={item.id} matchedContactName={item.matchedContactName} currentDecision={currentDecision} />
        {item.matchedContactName && item.email ? (
          <EnrichEmailCheckbox itemId={item.id} email={item.email} defaultChecked={item.enrichEmail} />
        ) : null}
        {item.company ? (
          <label className="ml-6 flex items-center gap-2 text-xs text-neutral-500">
            If added as new, company segment:
            <SegmentSelect itemId={item.id} defaultValue={suggestedSegment} options={SEGMENT_OPTIONS} />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function DoneStep({ items }: { items: ImportItem[] }) {
  const added = items.filter((i) => i.selectedForCrm && i.matchDecision === "CREATE_NEW");
  const merged = items.filter((i) => i.selectedForCrm && i.matchDecision === "MERGE_INTO_EXISTING");
  const skipped = items.filter((i) => !i.selectedForCrm || i.matchDecision === "SKIP");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Added as new ({added.length})</h2>
        {added.length === 0 ? <p className="text-sm text-neutral-500">None.</p> : (
          <ul className="space-y-1 text-sm">
            {added.map((i) => (
              <li key={i.id}>
                {i.resultingNotionContactId ? (
                  <Link href={`/contacts/${i.resultingNotionContactId}`} className="text-neutral-900 hover:underline">
                    {i.firstName} {i.lastName}
                  </Link>
                ) : (
                  `${i.firstName} ${i.lastName}`
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Updated existing ({merged.length})</h2>
        {merged.length === 0 ? <p className="text-sm text-neutral-500">None.</p> : (
          <ul className="space-y-1 text-sm">
            {merged.map((i) => (
              <li key={i.id}>
                {i.resultingNotionContactId ? (
                  <Link href={`/contacts/${i.resultingNotionContactId}`} className="text-neutral-900 hover:underline">
                    {i.firstName} {i.lastName}
                  </Link>
                ) : (
                  `${i.firstName} ${i.lastName}`
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Not included ({skipped.length})</h2>
        <p className="text-xs text-neutral-400">These won&apos;t be shown again unless their LinkedIn info changes.</p>
      </div>
    </div>
  );
}
