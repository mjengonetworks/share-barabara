import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { HAZARD_TYPES, KENYA_COUNTIES, SEVERITIES } from "@/lib/constants";
import { matchOrCreateRoad } from "@/lib/roads";
import { RoadInput } from "@/components/site/road-input";
import { LocationButton } from "@/components/site/location-button";

export function AlertForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { identity } = useActiveIdentity();
  const [anonymous, setAnonymous] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    county: "Nairobi",
    road: "",
    hazard_type: "crash",
    severity: "medium",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const road_id = await matchOrCreateRoad(form.road, form.county);
      const { error } = await supabase.from("alerts").insert({
        ...form,
        road_id,
        user_id: user.id,
        page_id: identity.type === "page" ? identity.pageId : null,
        is_anonymous: identity.type === "profile" && anonymous,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert published, thank you");
      setForm({ ...form, title: "", description: "", road: "", latitude: null, longitude: null });
      setAnonymous(false);
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {KENYA_COUNTIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <RoadInput value={form.road} onChange={(v) => setForm({ ...form, road: v })} id="a-road" />
        <div className="sm:col-span-2">
          <LocationButton
            latitude={form.latitude}
            longitude={form.longitude}
            onLocate={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
          />
        </div>
        <div>
          <Label>Hazard type</Label>
          <Select
            value={form.hazard_type}
            onValueChange={(v) => setForm({ ...form, hazard_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HAZARD_TYPES.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Severity</Label>
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
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
      {identity.type === "profile" ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
          Post anonymously
        </label>
      ) : null}
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Publishing…" : "Publish alert"}
      </Button>
    </form>
  );
}
