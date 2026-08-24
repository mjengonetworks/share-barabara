import { useState } from "react";
import { Star } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function StarRatingWidget({ ratedUserId }: { ratedUserId: string }) {
  const { user } = useAuth();
  const [hover, setHover] = useState(0);
  const queryClient = useQueryClient();

  const rate = useMutation({
    mutationFn: async (stars: number) => {
      if (!user) throw new Error("Sign in first");
      const { error } = await supabase
        .from("user_ratings")
        .upsert(
          { rater_id: user.id, rated_user_id: ratedUserId, stars },
          { onConflict: "rater_id,rated_user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rating submitted");
      queryClient.invalidateQueries({ queryKey: ["contributor-score", ratedUserId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n} stars`}
          disabled={rate.isPending}
          onClick={() => rate.mutate(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            className={`size-5 ${n <= hover ? "fill-caution text-caution" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}
