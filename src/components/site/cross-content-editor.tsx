import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, Save, Sparkles, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  generateEditorialDraft,
  type EditorialContentType,
  type EditorialValue,
} from "@/lib/ai/editorial.functions";

const callGenerate = generateEditorialDraft as unknown as (args: {
  data: unknown;
}) => Promise<{ draft?: Record<string, EditorialValue> }>;
const types: EditorialContentType[] = ["article", "report", "alert", "campaign", "infrastructure"];
const targets: Record<EditorialContentType, EditorialContentType[]> = {
  article: ["report", "alert", "campaign", "infrastructure"],
  report: ["article", "alert", "campaign", "infrastructure"],
  alert: ["article", "report", "infrastructure"],
  campaign: ["article"],
  infrastructure: ["article", "alert"],
};

function label(value: EditorialContentType) {
  return value === "report" ? "Accident Report" : value.charAt(0).toUpperCase() + value.slice(1);
}
function firstTarget(sourceType: EditorialContentType): EditorialContentType {
  return targets[sourceType][0] ?? "article";
}

function sourceText(record: Record<string, unknown>) {
  return Object.entries(record)
    .filter(
      ([key, value]) =>
        !["id", "created_at", "updated_at"].includes(key) &&
        value !== null &&
        value !== undefined &&
        value !== "",
    )
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("\n");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function CrossContentEditor({
  sourceType,
  sourceId,
  sourceRecord,
}: {
  sourceType: EditorialContentType;
  sourceId: string;
  sourceRecord: Record<string, unknown>;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<EditorialContentType>(() => firstTarget(sourceType));
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [newTag, setNewTag] = useState("");
  const [linkTargetType, setLinkTargetType] = useState<EditorialContentType>(() =>
    firstTarget(sourceType),
  );
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkSearch, setLinkSearch] = useState("");

  const relationships = useQuery({
    queryKey: ["editorial-relationships", sourceType, sourceId],
    queryFn: async () => {
      const [outgoing, incoming] = await Promise.all([
        (supabase as any)
          .from("editorial_content_relationships")
          .select("*")
          .eq("source_type", sourceType)
          .eq("source_id", sourceId),
        (supabase as any)
          .from("editorial_content_relationships")
          .select("*")
          .eq("target_type", sourceType)
          .eq("target_id", sourceId),
      ]);
      if (outgoing.error) throw outgoing.error;
      if (incoming.error) throw incoming.error;
      return [...(outgoing.data ?? []), ...(incoming.data ?? [])] as Array<Record<string, unknown>>;
    },
  });

  const tags = useQuery({
    queryKey: ["editorial-tags", tagQuery],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("editorial_search_tags", {
        _query: tagQuery,
        _limit: 20,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; label: string; slug: string }>;
    },
  });

  const assignedTags = useQuery({
    queryKey: ["editorial-content-tags", sourceType, sourceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("editorial_content_tags")
        .select("tag_id, editorial_tags(id,label,slug)")
        .eq("content_type", sourceType)
        .eq("content_id", sourceId);
      if (error) throw error;
      return (data ?? []) as Array<{
        tag_id: string;
        editorial_tags?: { id: string; label: string; slug: string } | null;
      }>;
    },
  });

  const savedDrafts = useQuery({
    queryKey: ["editorial-related-drafts", sourceType, sourceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("editorial_related_drafts")
        .select("id,target_type,status,generated_draft,updated_at")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .order("updated_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        target_type: EditorialContentType;
        status: string;
        generated_draft: Record<string, unknown>;
        updated_at: string;
      }>;
    },
  });

  const relatedSearch = useQuery({
    queryKey: ["editorial-related-search", linkSearch],
    enabled: linkSearch.trim().length >= 2,
    queryFn: async () => {
      const tables: Array<[EditorialContentType, string]> = [
        ["article", "news"],
        ["report", "accident_reports"],
        ["alert", "alerts"],
        ["campaign", "campaigns"],
        ["infrastructure", "infrastructure_issues"],
      ];
      const needle = `%${linkSearch.trim().replace(/[%_]/g, "\\$&")}%`;
      const results = await Promise.all(
        tables
          .filter(([type]) => type !== sourceType)
          .map(async ([type, table]) => {
            const { data, error } = await (supabase as any)
              .from(table)
              .select("id,title,slug")
              .ilike("title", needle)
              .limit(5);
            if (error) throw error;
            return (data ?? []).map((row: { id: string; title?: string; slug?: string }) => ({
              type,
              id: row.id,
              title: row.title ?? "Untitled",
              slug: row.slug,
            }));
          }),
      );
      return results.flat().slice(0, 12);
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const response = await callGenerate({
        data: {
          contentType: targetType,
          mode: "generate",
          provider: "grok",
          source: sourceText(sourceRecord),
        },
      });
      if (!response.draft) throw new Error("No usable related-content draft was returned");
      return response.draft;
    },
    onSuccess: (value) => {
      setDraft(value);
      setAcceptedFields(new Set(Object.keys(value)));
      setDraftId(null);
      toast.success(`${label(targetType)} draft generated. Review it before saving.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!draft || !user) throw new Error("Generate a draft while signed in.");
      const reviewedDraft = Object.fromEntries(
        Object.entries(draft).filter(([key]) => acceptedFields.has(key)),
      );
      const snapshot = JSON.stringify(sourceRecord);
      const hash = await sha256(snapshot);
      if (draftId) {
        const { data, error } = await (supabase.rpc as any)("editorial_update_related_draft", {
          _draft_id: draftId,
          _generated_draft: reviewedDraft,
        });
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase.rpc as any)("editorial_register_related_draft", {
        _source_type: sourceType,
        _source_id: sourceId,
        _target_type: targetType,
        _request_id: crypto.randomUUID(),
        _provider: "grok",
        _prompt_version: "cross-content-v1",
        _source_snapshot: sourceRecord,
        _source_snapshot_hash: hash,
        _generated_draft: reviewedDraft,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (value) => {
      setDraftId((value as { id?: string } | null)?.id ?? draftId);
      toast.success("Related draft saved. It remains unpublished.");
      void queryClient.invalidateQueries({
        queryKey: ["editorial-relationships", sourceType, sourceId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const finalizeDraft = useMutation({
    mutationFn: async () => {
      if (!draftId || !targetId.trim()) throw new Error("Enter the saved target record ID.");
      const { data, error } = await (supabase.rpc as any)("editorial_finalize_related_draft", {
        _draft_id: draftId,
        _target_type: targetType,
        _target_id: targetId.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setTargetId("");
      void queryClient.invalidateQueries({
        queryKey: ["editorial-relationships", sourceType, sourceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["editorial-related-drafts", sourceType, sourceId],
      });
      toast.success("Reviewed draft linked to the saved target record.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createDraftRecord = useMutation({
    mutationFn: async () => {
      if (!draftId || acceptedFields.size === 0)
        throw new Error("Save and accept at least one generated field first.");
      const reviewedDraft = Object.fromEntries(
        Object.entries(draft ?? {}).filter(([key]) => acceptedFields.has(key)),
      );
      const { data, error } = await (supabase.rpc as any)("editorial_create_related_draft_record", {
        _draft_id: draftId,
        _accepted_fields: reviewedDraft,
      });
      if (error) throw error;
      return data as { editor_path?: string; draft_id?: string };
    },
    onSuccess: (value) => {
      void queryClient.invalidateQueries({
        queryKey: ["editorial-relationships", sourceType, sourceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["editorial-related-drafts", sourceType, sourceId],
      });
      toast.success("Draft created and linked. Opening the destination editor…");
      if (value.editor_path) window.location.assign(value.editor_path);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addTag = useMutation({
    mutationFn: async () => {
      if (!newTag.trim() || !user) throw new Error("Enter a tag name.");
      const slug = newTag
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!slug) throw new Error("Enter a tag name using letters or numbers.");
      const existing = await (supabase as any)
        .from("editorial_tags")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existing.error) throw existing.error;
      let data = existing.data as { id: string } | null;
      if (!data) {
        const created = await (supabase as any)
          .from("editorial_tags")
          .insert({ slug, label: newTag.trim(), created_by: user.id })
          .select("id")
          .single();
        if (created.error) throw created.error;
        data = created.data as { id: string };
      }
      const assigned = await (supabase.rpc as any)("editorial_assign_tag", {
        _type: sourceType,
        _id: sourceId,
        _tag: data.id,
      });
      if (assigned.error) throw assigned.error;
    },
    onSuccess: () => {
      setNewTag("");
      void queryClient.invalidateQueries({ queryKey: ["editorial-tags"] });
      void queryClient.invalidateQueries({
        queryKey: ["editorial-content-tags", sourceType, sourceId],
      });
      toast.success("Tag assigned");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assignTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await (supabase.rpc as any)("editorial_assign_tag", {
        _type: sourceType,
        _id: sourceId,
        _tag: tagId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["editorial-content-tags", sourceType, sourceId],
      });
      toast.success("Tag assigned");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await (supabase.rpc as any)("editorial_remove_tag", {
        _type: sourceType,
        _id: sourceId,
        _tag: tagId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["editorial-content-tags", sourceType, sourceId],
      });
      toast.success("Tag removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const link = useMutation({
    mutationFn: async () => {
      if (!linkTargetId.trim()) throw new Error("Enter the target record ID.");
      const { error } = await (supabase.rpc as any)("editorial_link_content", {
        _source_type: sourceType,
        _source_id: sourceId,
        _target_type: linkTargetType,
        _target_id: linkTargetId.trim(),
        _relationship_type: "related",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLinkTargetId("");
      void queryClient.invalidateQueries({
        queryKey: ["editorial-relationships", sourceType, sourceId],
      });
      toast.success("Content linked");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unlink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)("editorial_unlink_content", {
        _relationship_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["editorial-relationships", sourceType, sourceId],
      });
      toast.success("Content unlinked");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const loadSavedDraft = (saved: {
    id: string;
    target_type: EditorialContentType;
    generated_draft: Record<string, unknown>;
  }) => {
    setTargetType(saved.target_type);
    setDraftId(saved.id);
    setDraft(saved.generated_draft);
    setAcceptedFields(new Set(Object.keys(saved.generated_draft)));
  };

  return (
    <section
      className="space-y-4 rounded-lg border border-accent/30 bg-accent/5 p-4"
      aria-label="Cross-content editorial tools"
    >
      <div>
        <h3 className="flex items-center gap-2 font-bold">
          <Link2 className="size-4 text-accent" /> Related content
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Generate an unpublished, source-linked draft or connect an existing record. Source content
          is never changed.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <Label>Generate target</Label>
          <Select
            value={targetType}
            onValueChange={(value) => setTargetType(value as EditorialContentType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets[sourceType].map((value) => (
                <SelectItem key={value} value={value}>
                  {label(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          className="self-end"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
        >
          <Sparkles className="mr-2 size-4" />
          {generate.isPending ? "Generating…" : "Generate related draft"}
        </Button>
      </div>
      {draft ? (
        <div className="space-y-3">
          <div>
            <Label>Review generated fields before saving</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Accept or reject each proposed field. The source record is unchanged and the
              destination remains a draft.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(draft).map(([key, value]) => (
              <label
                key={key}
                className="space-y-1 rounded border border-border bg-background p-2 text-xs"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Checkbox
                    checked={acceptedFields.has(key)}
                    onCheckedChange={(checked) =>
                      setAcceptedFields((current) => {
                        const next = new Set(current);
                        if (checked === true) next.add(key);
                        else next.delete(key);
                        return next;
                      })
                    }
                  />
                  {key}
                </span>
                <Textarea
                  value={
                    Array.isArray(value) || typeof value === "object"
                      ? JSON.stringify(value)
                      : value == null
                        ? ""
                        : String(value)
                  }
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, [key]: event.target.value } : current,
                    )
                  }
                  rows={2}
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveDraft.isPending || acceptedFields.size === 0}
              onClick={() => saveDraft.mutate()}
            >
              <Save className="mr-2 size-4" />
              {saveDraft.isPending
                ? "Saving…"
                : draftId
                  ? "Save draft edits"
                  : "Save related draft"}
            </Button>
            {draftId ? (
              <>
                <Button
                  type="button"
                  disabled={createDraftRecord.isPending}
                  onClick={() => createDraftRecord.mutate()}
                >
                  {createDraftRecord.isPending ? "Creating…" : "Save as new draft"}
                </Button>
                <Input
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  placeholder="Saved destination record UUID"
                  aria-label="Saved destination record UUID"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={finalizeDraft.isPending}
                  onClick={() => finalizeDraft.mutate()}
                >
                  {finalizeDraft.isPending ? "Linking…" : "Link saved draft"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {savedDrafts.data?.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Saved related drafts
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {savedDrafts.data.map((saved) => (
              <button
                key={saved.id}
                type="button"
                className={`rounded border p-2 text-left text-xs transition-colors hover:bg-muted/50 ${draftId === saved.id ? "border-accent bg-accent/10" : "border-border bg-background"}`}
                onClick={() => loadSavedDraft(saved)}
              >
                <span className="font-semibold">{label(saved.target_type)}</span>
                <span className="ml-2 text-muted-foreground">{saved.status}</span>
                <span className="mt-1 block line-clamp-2">
                  {String(saved.generated_draft?.["title"] ?? "Untitled draft")}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <Label>Assign existing tag</Label>
          <Input
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            placeholder="Search tags…"
          />
        </div>
        <div className="self-end flex flex-wrap gap-2">
          {tags.data?.slice(0, 4).map((tag) => (
            <Button
              key={tag.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => assignTag.mutate(tag.id)}
            >
              <Tag className="mr-1 size-3" />
              {tag.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(event) => setNewTag(event.target.value)}
          placeholder="Create and assign a new tag"
        />
        <Button
          type="button"
          variant="outline"
          disabled={addTag.isPending}
          onClick={() => addTag.mutate()}
        >
          <Plus className="mr-1 size-4" />
          Tag
        </Button>
      </div>
      {assignedTags.data?.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Assigned tags">
          {assignedTags.data.map((assignment) =>
            assignment.editorial_tags ? (
              <span
                key={assignment.tag_id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
              >
                <Tag className="size-3 text-muted-foreground" />
                {assignment.editorial_tags.label}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label={`Remove tag ${assignment.editorial_tags.label}`}
                  onClick={() => removeTag.mutate(assignment.tag_id)}
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : null,
          )}
        </div>
      ) : null}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <Label>Link target type</Label>
            <Select
              value={linkTargetType}
              onValueChange={(value) => setLinkTargetType(value as EditorialContentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types
                  .filter((value) => value !== sourceType)
                  .map((value) => (
                    <SelectItem key={value} value={value}>
                      {label(value)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Search related content</Label>
            <Input
              value={linkSearch}
              onChange={(event) => setLinkSearch(event.target.value)}
              placeholder="Search by title…"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="self-end"
            disabled={link.isPending}
            onClick={() => link.mutate()}
          >
            Link
          </Button>
        </div>
        {relatedSearch.data?.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {relatedSearch.data.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                className="rounded border border-border bg-background p-2 text-left text-xs hover:bg-muted/50"
                onClick={() => {
                  setLinkTargetType(result.type);
                  setLinkTargetId(result.id);
                  setLinkSearch(result.title);
                }}
              >
                <span className="font-semibold">{result.title}</span>
                <span className="ml-2 text-muted-foreground">{label(result.type)}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div>
          <Label htmlFor={`related-id-${sourceId}`}>Selected target ID</Label>
          <Input
            id={`related-id-${sourceId}`}
            value={linkTargetId}
            onChange={(event) => setLinkTargetId(event.target.value)}
            placeholder="Choose a search result or enter a UUID"
          />
        </div>
      </div>
      {relationships.data?.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Existing relationships
          </p>
          {relationships.data.map((relationship) => (
            <div
              key={String(relationship["id"])}
              className="flex items-center gap-2 rounded border border-border bg-background p-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">
                {String(relationship["source_type"])} → {String(relationship["target_type"])} ·{" "}
                {String(
                  relationship["target_id"] === sourceId
                    ? relationship["source_id"]
                    : relationship["target_id"],
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Unlink content"
                onClick={() => unlink.mutate(String(relationship["id"]))}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
