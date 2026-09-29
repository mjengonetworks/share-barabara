import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  generateEditorialDraft,
  type EditorialContentType,
  type EditorialMode,
  type EditorialProposal,
} from "@/lib/ai/editorial.functions";

const callGenerateEditorialDraft = generateEditorialDraft as unknown as (args: {
  data: unknown;
}) => Promise<{
  draft?: Record<string, string | number>;
  proposal?: EditorialProposal;
}>;

export function EditorialAIButton({
  contentType,
  source,
  onDraft,
  mode = "autopopulate",
  contentId,
}: {
  contentType: EditorialContentType;
  source: string;
  onDraft: (draft: Record<string, string | number>) => void;
  mode?: EditorialMode;
  contentId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<EditorialProposal | null>(null);

  async function generate() {
    if ((!source.trim() && mode !== "update") || busy) return;
    setBusy(true);
    try {
      const result = await callGenerateEditorialDraft({
        data: { contentType, source, mode, ...(contentId ? { contentId } : {}) },
      });
      if (mode === "update") {
        if (!result.proposal) throw new Error("No proposal returned");
        setProposal(result.proposal);
        toast.success("Editorial AI prepared a proposal. Review Current vs Proposed before applying it.");
      } else if (result.draft) {
        onDraft(result.draft);
        toast.success("Editorial AI values placed in the form. Review them before saving or publishing.");
      } else throw new Error("No draft returned");
    } catch {
      toast.error("Editorial AI could not prepare a proposal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={() => void generate()} disabled={busy}>
        <Sparkles className="mr-2 size-4" />
        {busy
          ? "Preparing proposal..."
          : mode === "update"
            ? "Update with AI"
            : mode === "generate"
              ? "Generate with AI"
              : "Auto-Populate with AI"}
      </Button>
      {proposal ? (
        <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
          <p className="font-semibold">Current vs Proposed</p>
          <div className="space-y-2">
            {proposal.changedFields.map((field) => (
              <div key={field} className="grid gap-1 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Current · {field}
                  </p>
                  <p className="break-words">{String(proposal.current[field] ?? "—")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Proposed
                  </p>
                  <p className="break-words">{String(proposal.proposed[field] ?? "—")}</p>
                </div>
              </div>
            ))}
            {proposal.changedFields.length === 0 ? (
              <p className="text-muted-foreground">No supported field changes were proposed.</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onDraft(proposal.proposed);
              setProposal(null);
              toast.success("Proposed values placed in the editable form. Save through the normal workflow.");
            }}
          >
            Apply proposed values to form
          </Button>
        </div>
      ) : null}
    </div>
  );
}
