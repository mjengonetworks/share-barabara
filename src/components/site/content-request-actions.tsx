import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  entityType: "alert" | "report" | "news";
  entityId: string;
  ownerId: string | null;
};

/** Lets the person who submitted an alert/report/article ask an editor to change or remove it.
 *  Just the submission for now — the review queue for these lands with the rest of the admin tools. */
export function ContentRequestActions({ entityType, entityId, ownerId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState<"edit" | "removal" | null>(null);
  const [message, setMessage] = useState("");

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

  if (!user || user.id !== ownerId) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
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
          <p className="text-sm text-muted-foreground">Tell an editor why this should come down.</p>
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
    </div>
  );
}
