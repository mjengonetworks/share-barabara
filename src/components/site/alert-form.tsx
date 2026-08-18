import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HAZARD_TYPES, KENYA_COUNTIES, SEVERITIES } from "@/lib/constants";

export function AlertForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    county: "Nairobi",
    road: "",
    hazard_type: "crash",
    severity: "medium",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("alerts").insert({ ...form, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert published — thank you");
      setForm({ ...form, title: "", description: "", road: "" });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <div>
        <Label htmlFor="a-title">What is happening?</Label>
        <Input
          id="a-title"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Lorry overturned blocking two lanes"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>County</Label>
          <Select value={form.county} onValueChange={(v) => setForm({ ...form, county: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {KENYA_COUNTIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="a-road">Road or landmark</Label>
          <Input
            id="a-road"
            value={form.road}
            onChange={(e) => setForm({ ...form, road: e.target.value })}
            placeholder="e.g. A104 near Salgaa"
          />
        </div>
        <div>
          <Label>Hazard type</Label>
          <Select
            value={form.hazard_type}
            onValueChange={(v) => setForm({ ...form, hazard_type: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HAZARD_TYPES.map((h) => (
                <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Severity</Label>
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="a-desc">Details</Label>
        <Textarea
          id="a-desc"
          required
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Direction of travel, how long the hazard has been there, whether emergency services are on scene."
        />
      </div>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Publishing…" : "Publish alert"}
      </Button>
    </form>
  );
}