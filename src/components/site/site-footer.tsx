import { Link } from "@tanstack/react-router";
import { EMERGENCY_CONTACTS } from "@/lib/constants";
import iconAsset from "@/assets/share-barabara-icon.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="mt-20 asphalt text-secondary">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={iconAsset.url} alt="" className="size-9" width={36} height={36} />
            <p className="font-display text-lg font-extrabold uppercase text-background">
              Share Barabara
            </p>
          </div>
          <p className="mt-3 text-sm text-secondary/70">
            A community road safety platform for Kenya: verified news, open crash
            statistics and hazard alerts from the people who use the roads daily.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-secondary/70">
            <li><Link to="/news">Road safety news</Link></li>
            <li><Link to="/alerts">Live hazard alerts</Link></li>
            <li><Link to="/reports">Accident reports</Link></li>
            <li><Link to="/statistics">Crash statistics</Link></li>
            <li><Link to="/safety">Safety guidance</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Emergency numbers
          </p>
          <ul className="mt-3 space-y-2 text-sm text-secondary/70">
            {EMERGENCY_CONTACTS.map((c) => (
              <li key={c.name}>
                {c.name}: <span className="text-background">{c.number}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Contribute</p>
          <p className="mt-3 text-sm text-secondary/70">
            Sign in to post a hazard alert, file an accident report or join the
            discussion on any story.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Create an account
          </Link>
        </div>
      </div>
      <div className="hazard-stripe h-2" />
      <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-secondary/50">
        Community-sourced information. Always call 999 or 112 in an emergency.
        Statistics are indicative national figures for public awareness.
      </div>
    </footer>
  );
}