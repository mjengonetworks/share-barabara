import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) {
      navigate({ to: "/search", search: { q: q.trim() } });
      setOpen(false);
      setQ("");
    }
  }

  if (!open) {
    return (
      <button
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        <Search className="size-4" />
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="relative flex items-center">
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => {
          if (!q) setOpen(false);
        }}
        placeholder="Search…"
        className="h-9 w-36 pr-8 sm:w-56"
      />
      <button
        type="button"
        aria-label="Close search"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen(false);
          setQ("");
        }}
        className="absolute right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </form>
  );
}
