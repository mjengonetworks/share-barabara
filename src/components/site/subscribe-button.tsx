import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";

export function SubscribeButton() {
  const { user } = useAuth();
  const { data: statuses = {} } = useSubscriptionStatuses([user?.id]);
  const subscribed = !!user && !!statuses[user.id];

  return (
    <Link
      to="/subscribe"
      aria-label={subscribed ? "You're subscribed" : "Subscribe"}
      title={subscribed ? "You're subscribed" : "Subscribe"}
      className={`flex size-9 items-center justify-center rounded-full border transition-colors ${
        subscribed
          ? "border-accent bg-accent text-accent-foreground"
          : "border-accent bg-accent/10 text-accent hover:bg-accent/20"
      }`}
    >
      <BadgeCheck className="size-5" />
    </Link>
  );
}
