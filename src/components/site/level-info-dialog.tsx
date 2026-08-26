import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LEVELS } from "@/lib/gamification";

/** Click-through on the level badge: shows how many points every level needs
 *  and highlights where this profile currently sits. Points come from net
 *  upvotes on alerts/reports/comments plus referral points. */
export function LevelInfoDialog({ points, children }: { points: number; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="cursor-pointer">
          {children}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account levels</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Points come from the net upvotes your alerts, reports and comments receive (downvotes
          count against you), plus points earned from referrals.
        </p>
        <p className="text-sm">
          You have <span className="font-bold">{points}</span> points.
        </p>
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
          {LEVELS.map((l) => {
            const current = points >= l.min && points <= l.max;
            return (
              <li
                key={l.level}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                  current ? "bg-accent/10 font-semibold" : ""
                }`}
              >
                <span>
                  {l.icon} Level {l.level}
                  {current ? " · you are here" : ""}
                </span>
                <span className="text-muted-foreground">
                  {l.max === Infinity ? `${l.min}+ pts` : `${l.min}–${l.max} pts`}
                </span>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
