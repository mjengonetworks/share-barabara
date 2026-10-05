import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { AttachmentsField, type Attachment } from "@/components/site/attachments-field";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type UpdateRow = {
  id: string;
  title: string | null;
  body: string;
  attachments: Attachment[];
  status: "draft" | "published";
  author_id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export function EditorialUpdatesManager({
  parentType,
  parentId,
  parentTitle,
  parentBody,
}: {
  parentType: "alert" | "report";
  parentId: string;
  parentTitle: string;
  parentBody: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const queryKey = ["admin-editorial-updates", parentType, parentId];
  const updatesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase.from("editorial_updates") as any)
        .select("id,title,body,attachments,status,author_id,created_at,updated_at,published_at")
        .eq("parent_type", parentType)
        .eq("parent_id", parentId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UpdateRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in to save an update.");
      if (body.trim().length < 3) throw new Error("Write the update body before saving.");
      const payload = {
        parent_type: parentType,
        parent_id: parentId,
        title: title.trim() || null,
        body: body.trim(),
        attachments,
        status,
        author_id: user.id,
        published_at: status === "published" ? new Date().toISOString() : null,
      };
      const request = editingId
        ? (supabase.from("editorial_updates") as any).update(payload).eq("id", editingId)
        : (supabase.from("editorial_updates") as any).insert(payload);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(status === "published" ? "Update published" : "Draft saved");
      reset();
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["editorial-updates", parentType, parentId] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("editorial_updates") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Update deleted");
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["editorial-updates", parentType, parentId] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete update"),
  });

  function reset() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setStatus("draft");
    setAttachments([]);
  }

  function edit(update: UpdateRow) {
    setEditingId(update.id);
    setTitle(update.title ?? "");
    setBody(update.body);
    setStatus(update.status);
    setAttachments(update.attachments ?? []);
  }

  function applyProposal(draft: Record<string, unknown>) {
    if (typeof draft.title === "string") setTitle(draft.title);
    if (typeof draft.description === "string") setBody(draft.description);
    if (typeof draft.body === "string") setBody(draft.body);
  }

  const source = `${parentTitle}\n${parentBody}`;
  const current = { title, description: body, body, parent_type: parentType };

  return (
    <section className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-4" aria-labelledby={`updates-manager-${parentId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`updates-manager-${parentId}`} className="flex items-center gap-2 font-bold"><FilePlus2 className="size-4 text-accent" /> Editorial updates</h3>
          <p className="mt-1 text-xs text-muted-foreground">Create a dated draft or publish a verified update. AI suggestions stay in this form until you save.</p>
        </div>
        {editingId ? <Button type="button" size="sm" variant="ghost" onClick={reset}>New update</Button> : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <EditorialAIButton contentType={parentType} mode="generate" source={source} onDraft={applyProposal} />
        <EditorialAIButton contentType={parentType} mode="autopopulate" source={source} onDraft={applyProposal} />
        {editingId ? <EditorialAIButton contentType={parentType} mode="update" contentId={editingId} source="" current={current} onDraft={applyProposal} /> : null}
      </div>

      <div className="mt-4 space-y-3">
        <div><Label htmlFor={`update-title-${parentId}`}>Title (optional)</Label><Input id={`update-title-${parentId}`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Road reopened after clearance" /></div>
        <div><Label htmlFor={`update-body-${parentId}`}>Update body</Label><RichTextEditor id={`update-body-${parentId}`} value={body} onChange={setBody} rows={7} required placeholder="Record only verified new information…" /></div>
        <div><Label>Attachments</Label><AttachmentsField value={attachments} onChange={setAttachments} /></div>
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>Status</Label><Select value={status} onValueChange={(value: "draft" | "published") => setStatus(value)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select></div>
          <Button type="button" disabled={save.isPending || !body.trim()} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : editingId ? "Save update" : status === "published" ? "Publish update" : "Save draft"}</Button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-semibold">Saved updates</h4>
        {updatesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading updates…</p> : null}
        {!updatesQuery.isLoading && !updatesQuery.data?.length ? <p className="text-sm text-muted-foreground">No updates yet.</p> : null}
        {updatesQuery.data?.map((update) => <div key={update.id} className="flex flex-wrap items-center gap-2 rounded border border-border bg-background p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{update.title || "Untitled update"}</p><p className="text-xs text-muted-foreground">{update.status} · {new Date(update.updated_at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</p></div><Button type="button" size="sm" variant="outline" onClick={() => edit(update)}><Pencil className="mr-1 size-3.5" /> Edit</Button><Button type="button" size="icon" variant="ghost" aria-label="Delete update" onClick={() => { if (window.confirm("Delete this update?")) remove.mutate(update.id); }}><Trash2 className="size-4 text-destructive" /></Button></div>)}
      </div>
    </section>
  );
}
