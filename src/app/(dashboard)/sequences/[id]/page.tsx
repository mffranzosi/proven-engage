import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listContacts } from "@/lib/notion";
import {
  addStep,
  addBranchOption,
  enrollContact,
  enrollList,
  selectBranch,
  checkEnrollmentReply,
} from "@/lib/actions/sequences";

export const dynamic = "force-dynamic";

export default async function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [sequence, contacts, lists] = await Promise.all([
    prisma.sequence.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: "asc" }, include: { branchOptions: true } },
        enrollments: {
          orderBy: { enrolledAt: "asc" },
          include: { currentStep: true, events: { orderBy: { occurredAt: "desc" }, take: 1 } },
        },
      },
    }),
    listContacts(),
    prisma.contactList.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!sequence) notFound();

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const addStepWithId = addStep.bind(null, sequence.id);
  const enrollContactWithId = enrollContact.bind(null, sequence.id);
  const enrollListWithId = enrollList.bind(null, sequence.id);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/sequences" className="text-sm text-neutral-500 hover:underline">
          ← Sequences
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{sequence.name}</h1>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">Steps</h2>
        {sequence.steps.length === 0 ? (
          <p className="text-sm text-neutral-500">No steps yet — add the first one below.</p>
        ) : (
          sequence.steps.map((step) => {
            const addBranchWithIds = addBranchOption.bind(null, sequence.id, step.id);
            const otherSteps = sequence.steps.filter((s) => s.id !== step.id);
            return (
              <div key={step.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">
                    Step {step.order + 1}: {step.subject}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {step.order === 0 ? `sends ${step.delayDays}d after enrollment` : `sends ${step.delayDays}d after previous step`}
                    {step.isTerminal ? " · ends sequence" : ""}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-xs text-neutral-600">{step.bodyTemplate}</p>

                <div className="mt-3 border-t border-neutral-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-neutral-700">Branch options (triggered manually on reply)</p>
                  {step.branchOptions.length > 0 ? (
                    <ul className="mb-2 space-y-1">
                      {step.branchOptions.map((b) => {
                        const targetStep = sequence.steps.find((s) => s.id === b.nextStepId);
                        return (
                          <li key={b.id} className="text-xs text-neutral-600">
                            &ldquo;{b.label}&rdquo; → Step {targetStep ? targetStep.order + 1 : "?"}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {otherSteps.length > 0 ? (
                    <form action={addBranchWithIds} className="flex gap-2">
                      <input name="label" placeholder="e.g. tell me more" required className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs" />
                      <select name="nextStepId" required defaultValue="" className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
                        <option value="" disabled>
                          Jump to…
                        </option>
                        {otherSteps.map((s) => (
                          <option key={s.id} value={s.id}>
                            Step {s.order + 1}: {s.subject}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                        Add
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-neutral-400">Add another step first to be able to branch to it.</p>
                  )}
                </div>
              </div>
            );
          })
        )}

        <form action={addStepWithId} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-neutral-900">Add step</h3>
          <div>
            <label className="block text-xs font-medium text-neutral-700">Subject</label>
            <input name="subject" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700">Body</label>
            <p className="mb-1 text-xs text-neutral-400">
              Use <code>{"{{firstName}}"}</code> or <code>{"{{fullName}}"}</code> to merge in the contact&apos;s name.
            </p>
            <textarea name="bodyTemplate" rows={5} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono" />
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Delay (days {sequence.steps.length === 0 ? "after enrollment" : "after previous step"})
              </label>
              <input name="delayDays" type="number" min={0} defaultValue={sequence.steps.length === 0 ? 0 : 5} required className="mt-1 w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-xs text-neutral-700">
              <input type="checkbox" name="isTerminal" /> Ends the sequence (no automatic follow-up)
            </label>
          </div>
          <button type="submit" className="rounded-md bg-proven-yellow px-3 py-2 text-sm font-semibold text-proven-black hover:bg-proven-yellow-dark">
            Add step
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Enroll contacts</h2>
        <div className="grid grid-cols-2 gap-4">
          <form action={enrollContactWithId} className="flex gap-2">
            <select name="contactId" required defaultValue="" className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="" disabled>
                Select a contact…
              </option>
              {[...contacts].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Enroll
            </button>
          </form>
          <form action={enrollListWithId} className="flex gap-2">
            <select name="listId" required defaultValue="" className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="" disabled>
                Select a list…
              </option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Enroll all
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Enrollments ({sequence.enrollments.length})</h2>
        {sequence.enrollments.length === 0 ? (
          <p className="text-sm text-neutral-500">No one enrolled yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500">
              <tr>
                <th className="py-2 font-medium">Contact</th>
                <th className="py-2 font-medium">Current step</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Next send</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sequence.enrollments.map((e) => {
                const contact = contactById.get(e.notionContactId);
                const currentStep = sequence.steps.find((s) => s.id === e.currentStepId);
                const checkReply = checkEnrollmentReply.bind(null, sequence.id, e.id);
                const chooseBranch = selectBranch.bind(null, sequence.id, e.id);
                const hasSent = e.events.some((ev) => ev.type === "SENT");
                return (
                  <tr key={e.id} className="border-b border-neutral-100 last:border-0 align-top">
                    <td className="py-2">
                      <Link href={`/contacts/${e.notionContactId}`} className="text-neutral-900 hover:underline">
                        {contact?.name ?? "(unknown contact)"}
                      </Link>
                      {e.lastReplySnippet ? (
                        <div className="mt-1 max-w-xs text-xs italic text-neutral-500">&ldquo;{e.lastReplySnippet}&rdquo;</div>
                      ) : null}
                    </td>
                    <td className="py-2 text-neutral-600">{currentStep ? `Step ${currentStep.order + 1}: ${currentStep.subject}` : "—"}</td>
                    <td className="py-2 text-neutral-600">{e.status}</td>
                    <td className="py-2 text-neutral-600">{e.nextSendAt.toLocaleDateString()}</td>
                    <td className="py-2">
                      <div className="flex flex-col items-end gap-1">
                        {hasSent ? (
                          <form action={checkReply}>
                            <button type="submit" className="text-xs text-neutral-500 hover:underline">
                              Check for replies
                            </button>
                          </form>
                        ) : null}
                        {currentStep && currentStep.branchOptions.length > 0 ? (
                          <form action={chooseBranch} className="flex items-center gap-1">
                            <select name="branchOptionId" defaultValue="" className="rounded-md border border-neutral-300 px-1 py-0.5 text-xs">
                              <option value="" disabled>
                                Reply outcome…
                              </option>
                              {currentStep.branchOptions.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.label}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="rounded-md border border-neutral-300 px-2 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                              Apply
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
