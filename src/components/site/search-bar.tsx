import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar({ className = "" }: { className?: string }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  return (
    <form
      className={`flex min-w-0 items-center gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 2) navigate({ to: "/search", search: { q: q.trim() } });
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search news, alerts, reports…"
          className="h-10 pl-9"
          aria-label="Search Share Barabara"
        />
      </div>
      <Button type="submit" className="h-10 shrink-0 px-3 sm:px-4" aria-label="Submit search">
        Search
      </Button>
    </form>
  );
}
