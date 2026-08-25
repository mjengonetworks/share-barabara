import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar({ className = "" }: { className?: string }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  return (
    <form
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 2) navigate({ to: "/search", search: { q: q.trim() } });
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search news, alerts, reports…"
        className="pl-9"
        aria-label="Search Share Barabara"
      />
    </form>
  );
}
