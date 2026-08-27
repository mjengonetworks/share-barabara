import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PartyCasualtyInputs,
  type CasualtyBreakdown,
} from "@/components/site/party-casualty-inputs";
import { AttachmentsField, type Attachment } from "@/components/site/attachments-field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  entityType: "alert" | "report" | "news";
  entityId: string;
  ownerId: string | null;
  /** Parties already recorded as involved — when present, "Suggest an
   *  update" offers structured per-party casualty fields, same as the
   *  original submission form. */
  parties?: string[];
};

/** Owner-only edit/removal requests, plus a "Suggest an update" anyone
 *  signed in can use to send new information (revised casualty counts,
 *  photos/video, a status change) straight to the editors — commenting
 *  alone doesn't get new facts folded into the actual record. */
export function ContentRequestActions({ entityType, entityId, ownerId, parties = [] }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState<"edit" | "removal" | "update" | null>(null);
  const [message, setMessage] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [casualties, setCasualties] = useState<CasualtyBreakdown>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const submit = useMutation({
    mutationFn: async (requestType: "edit" | "removal") => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("content_requests").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        request_type: requestType,
        message: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request sent to our editors");
      setMessage("");
      setOpen(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitUpdate = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const hasCasualties = Object.keys(casualties).length > 0;
      const { error } = await supabase.from("content_requests").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        request_type: "update",
        message: updateMessage.trim(),
        casualty_breakdown: hasCasualties ? casualties : null,
        attachments,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Update sent to our editors, thank you");
      setUpdateMessage("");
      setCasualties({});
      setAttachments([]);
      setOpen(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;
  const isOwner = user.id === ownerId;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Dialog open={open === "update"} onOpenChange={(v) => setOpen(v ? "update" : null)}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <MessageSquarePlus className="mr-1 size-3.5" /> Suggest an update
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggest an update</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            New information since this was posted — condition changed, casualty numbers updated, a
            photo from the scene. Sent straight to our editors, who'll fold it into the record.
          </p>
          <Textarea
            rows={4}
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
            placeholder="What's changed or what did we get wrong?"
          />
          {parties.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Updated casualty counts (optional)
              </p>
              <PartyCasualtyInputs parties={parties} value={casualties} onChange={setCasualties} />
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Photos or video (optional)
            </p>
            <div className="mt-2">
              <AttachmentsField value={attachments} onChange={setAttachments} />
            </div>
          </div>
          <Button
            disabled={updateMessage.trim().length < 3 || submitUpdate.isPending}
            onClick={() => submitUpdate.mutate()}
          >
            {submitUpdate.isPending ? "Sending…" : "Send update"}
          </Button>
        </DialogContent>
      </Dialog>

      {isOwner ? (
        <>
          <Dialog open={open === "edit"} onOpenChange={(v) => setOpen(v ? "edit" : null)}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Pencil className="mr-1 size-3.5" /> Request edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request an edit</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Tell an editor what needs to change. They'll update it for you.
              </p>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What needs to be corrected or updated?"
              />
              <Button
                disabled={message.trim().length < 3 || submit.isPending}
                onClick={() => submit.mutate("edit")}
              >
                {submit.isPending ? "Sending…" : "Send request"}
              </Button>
            </DialogContent>
          </Dialog>

          <Dialog open={open === "removal"} onOpenChange={(v) => setOpen(v ? "removal" : null)}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="mr-1 size-3.5" /> Request removal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request removal</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Tell an editor why this should come down.
              </p>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Why should this be removed?"
              />
              <Button
                variant="destructive"
                disabled={message.trim().length < 3 || submit.isPending}
                onClick={() => submit.mutate("removal")}
              >
                {submit.isPending ? "Sending…" : "Send request"}
              </Button>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
