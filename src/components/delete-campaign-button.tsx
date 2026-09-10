"use client";

export function DeleteCampaignButton({
  action,
  campaignName,
  className,
}: {
  action: () => void;
  campaignName: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete campaign "${campaignName}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        Delete
      </button>
    </form>
  );
}
