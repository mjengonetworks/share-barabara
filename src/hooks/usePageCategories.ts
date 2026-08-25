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
      return data;
    },
  });
}
