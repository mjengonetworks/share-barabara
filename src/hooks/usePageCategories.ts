import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePageCategories() {
  return useQuery({
    queryKey: ["page-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      // Keep compatibility with the pre-Task-30 schema, which has no active
      // column. After the review migration, archived categories disappear
      // from public Page forms and directories without rewriting old rows.
      return (data ?? []).filter((row) => (row as { active?: boolean }).active !== false);
    },
  });
}
