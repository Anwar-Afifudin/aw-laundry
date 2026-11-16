import { supabase } from "~/lib/supabase/client";

import type { AdminService } from "../types";

export async function getAdminServices(): Promise<AdminService[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, slug, description, price, price_type, billing_unit, estimated_duration_hours, image_url, is_active, production_steps, created_at, updated_at")
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<AdminService[], { merge: false }>();

  if (error) throw error;
  return (data ?? []).map((service) => ({ ...service, price: Number(service.price) }));
}
