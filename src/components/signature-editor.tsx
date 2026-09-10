"use client";

import { useRef, useState } from "react";
import { updateAccountSignature } from "@/lib/actions/accounts";

export function SignatureEditor({ accountId, initialHtml }: { accountId: string; initialHtml: string | null }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const action = updateAccountSignature.bind(null, accountId);

  function syncHiddenInput() {
    if (hiddenInputRef.current && editorRef.current) {
      hiddenInputRef.current.value = editorRef.current.innerHTML;
    }
    setSaved(false);
  }

  function format(command: "bold" | "italic" | "underline") {
    document.execCommand(command);
    syncHiddenInput();
  }

  function preventFocusSteal(e: React.MouseEvent) {
    e.preventDefault();
  }

  function handleImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current?.focus();
      document.execCommand("insertImage", false, String(reader.result));
      syncHiddenInput();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <form
      action={action}
      onSubmit={() => setSaved(true)}
      className="space-y-2 rounded-md border border-neutral-200 p-3"
    >
      <div className="flex items-center gap-1">
        <button type="button" onMouseDown={preventFocusSteal} onClick={() => format("bold")} className="rounded border border-neutral-300 px-2 py-1 text-xs font-bold hover:bg-neutral-100">
          B
        </button>
        <button type="button" onMouseDown={preventFocusSteal} onClick={() => format("italic")} className="rounded border border-neutral-300 px-2 py-1 text-xs italic hover:bg-neutral-100">
          I
        </button>
        <button type="button" onMouseDown={preventFocusSteal} onClick={() => format("underline")} className="rounded border border-neutral-300 px-2 py-1 text-xs underline hover:bg-neutral-100">
          U
        </button>
        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
        >
          Add logo/image
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePicked} className="hidden" />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncHiddenInput}
        dangerouslySetInnerHTML={{ __html: initialHtml ?? "" }}
        className="min-h-24 rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input ref={hiddenInputRef} type="hidden" name="signatureHtml" defaultValue={initialHtml ?? ""} />

      <div className="flex items-center gap-2">
        <button type="submit" className="rounded-md bg-proven-yellow px-3 py-1.5 text-xs font-semibold text-proven-black hover:bg-proven-yellow-dark">
          Save signature
        </button>
        {saved ? <span className="text-xs text-neutral-400">Saved</span> : null}
      </div>
    </form>
  );
}
