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
import { KENYA_COUNTIES, REPORT_SEVERITIES } from "@/lib/constants";
import { matchOrCreateRoad } from "@/lib/roads";
import { RoadInput } from "@/components/site/road-input";
import { LocationButton } from "@/components/site/location-button";

export function ReportForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    county: "Nairobi",
    road: "",
    severity: "moderate",
    occurred_at: new Date().toISOString().slice(0, 16),
    vehicles_involved: 1,
    casualties: 0,
    fatalities: 0,
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const road_id = await matchOrCreateRoad(form.road, form.county);
      const { error } = await supabase.from("accident_reports").insert({
        ...form,
        road_id,
        occurred_at: new Date(form.occurred_at).toISOString(),
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted for review, an editor will verify it before it is published");
      setForm({ ...form, title: "", description: "", road: "", latitude: null, longitude: null });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
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
        <Label htmlFor="r-title">Summary</Label>
        <Input
          id="r-title"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Head-on collision between matatu and pickup"
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
        <RoadInput
          value={form.road}
          onChange={(v) => setForm({ ...form, road: v })}
          id="r-road"
          label="Road or location"
        />
        <div className="sm:col-span-2">
          <LocationButton
            latitude={form.latitude}
            longitude={form.longitude}
            onLocate={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
          />
        </div>
        <div>
          <Label htmlFor="r-when">When did it happen?</Label>
          <Input
            id="r-when"
            type="datetime-local"
            value={form.occurred_at}
            onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
          />
        </div>
        <div>
          <Label>Severity</Label>
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORT_SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="r-veh">Vehicles involved</Label>
          <Input
            id="r-veh"
            type="number"
            min={0}
            value={form.vehicles_involved}
            onChange={(e) => setForm({ ...form, vehicles_involved: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="r-cas">Injured</Label>
          <Input
            id="r-cas"
            type="number"
            min={0}
            value={form.casualties}
            onChange={(e) => setForm({ ...form, casualties: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="r-fat">Fatalities</Label>
          <Input
            id="r-fat"
            type="number"
            min={0}
            value={form.fatalities}
            onChange={(e) => setForm({ ...form, fatalities: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="r-desc">What happened?</Label>
        <Textarea
          id="r-desc"
          required
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Weather, road conditions, contributing factors and the response by emergency services."
        />
      </div>
      <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Reports are reviewed and may be edited for accuracy by a moderator or editor
        before they appear publicly. Published reports credit both of you.
      </p>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Submitting…" : "Submit report for review"}
      </Button>
    </form>
  );
}