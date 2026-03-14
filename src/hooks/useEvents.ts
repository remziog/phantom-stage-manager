import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

export type EventStatus = "Planning" | "Confirmed" | "In Progress" | "Completed" | "Cancelled";

export type Event = {
  id: string;
  name: string;
  customer_id: string | null;
  customer_name: string;
  quote_id: string | null;
  status: EventStatus;
  start_date: string;
  end_date: string;
  load_in_date: string | null;
  load_out_date: string | null;
  venue: string | null;
  venue_address: string | null;
  project_manager_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventEquipment = {
  id: string;
  event_id: string;
  equipment_id: string;
  quantity: number;
  notes: string | null;
  equipment?: { name: string; category: string };
};

export type EventTeam = {
  id: string;
  event_id: string;
  team_member_id: string;
  role_on_event: string | null;
  notes: string | null;
  team_member?: { full_name: string; role: string };
};

export type EventVehicle = {
  id: string;
  event_id: string;
  vehicle_id: string;
  notes: string | null;
  vehicle?: { name: string; license_plate: string };
};

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date");
      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["events", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Event;
    },
  });
}

export function useEventEquipment(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event_equipment", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_equipment")
        .select("*, equipment:equipment_id(name, category)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return data as EventEquipment[];
    },
  });
}

export function useEventTeam(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event_team", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_team")
        .select("*, team_member:team_member_id(full_name, role)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return data as EventTeam[];
    },
  });
}

export function useEventVehicles(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event_vehicles", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_vehicles")
        .select("*, vehicle:vehicle_id(name, license_plate)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return data as EventVehicle[];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: Omit<Event, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("events")
        .insert({ ...event, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as Event;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created");
      logActivity("Event created", "event", data.id, data.name);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { error } = await supabase.from("events").update(updates).eq("id", id);
      if (error) throw error;
      return { id, ...updates };
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["events", vars.id] });
      if (vars.status) {
        logActivity("Event status changed", "event", vars.id, `${vars.name || "Event"} → ${vars.status}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useAssignEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { event_id: string; equipment_id: string; quantity?: number }) => {
      const { error } = await supabase.from("event_equipment").insert(data);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event_equipment", vars.event_id] });
      toast.success("Equipment assigned");
      logActivity("Equipment assigned to event", "equipment", vars.equipment_id, `Qty: ${vars.quantity || 1}`);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useAssignTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { event_id: string; team_member_id: string; role_on_event?: string }) => {
      const { error } = await supabase.from("event_team").insert(data);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event_team", vars.event_id] });
      toast.success("Team member assigned");
      logActivity("Team member assigned to event", "team_member", vars.team_member_id, vars.role_on_event || undefined);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useAssignVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { event_id: string; vehicle_id: string }) => {
      const { error } = await supabase.from("event_vehicles").insert(data);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event_vehicles", vars.event_id] });
      toast.success("Vehicle assigned");
      logActivity("Vehicle assigned to event", "vehicle", vars.vehicle_id);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ table, id, eventId }: { table: "event_equipment" | "event_team" | "event_vehicles"; id: string; eventId: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return { table, eventId };
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: [vars.table, vars.eventId] });
      toast.success("Assignment removed");
    },
    onError: (e) => toast.error(e.message),
  });
}
