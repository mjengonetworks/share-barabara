import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renderRichText } from "@/lib/richtext";
import { longDateWithDay } from "@/lib/format";
import { AttachmentGallery, type AttachmentRow } from "@/components/site/attachment-gallery";

type Update = {
  id: string;
  title: string | null;
  body: string;
  attachments: AttachmentRow[] | null;
  published_at: string | null;
};

export function EditorialUpdates({ parentType, parentId }: { parentType: "alert" | "report"; parentId: string }) {
  const { data: updates = [] } = useQuery({
    queryKey: ["editorial-updates", parentType, parentId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("editorial_updates") as any)
        .select("id,title,body,attachments,published_at")
        .eq("parent_type", parentType)
        .eq("parent_id", parentId)
        .eq("status", "published")
        .order("published_at", { ascending: true });
      if (error) {
        // The review migration may not be active yet; the parent record remains usable.
        if (/editorial_updates|relation|does not exist/i.test(error.message ?? "")) return [];
        throw error;
      }
      return (data ?? []) as Update[];
    },
  });

  if (updates.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="editorial-updates-heading">
      <h2 id="editorial-updates-heading" className="flex items-center gap-2 text-lg font-bold">
        <FileText className="size-5 text-accent" /> Editorial updates
      </h2>
      <div className="mt-4 border-l-2 border-accent/40 pl-4 sm:pl-6">
        {updates.map((update) => (
          <article key={update.id} className="relative pb-7 last:pb-0">
            <span className="absolute -left-[1.56rem] top-1 size-3 rounded-full border-2 border-background bg-accent sm:-left-[1.94rem]" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {update.published_at ? longDateWithDay(update.published_at) : "Update"}
            </p>
            {update.title ? <h3 className="mt-1 text-base font-bold">{update.title}</h3> : null}
            <div className="mt-2 space-y-3 text-sm leading-6 text-foreground/90">{renderRichText(update.body)}</div>
            <AttachmentGallery attachments={update.attachments ?? []} />
          </article>
        ))}
      </div>
    </section>
  );
}
