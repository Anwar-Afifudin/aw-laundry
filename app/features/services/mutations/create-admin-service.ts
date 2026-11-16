import { supabase } from "~/lib/supabase/client";

import type { AdminService, AdminServiceInput } from "../types";

export async function createAdminService(input: AdminServiceInput): Promise<AdminService> {
  const { data, error } = await supabase
    .from("services")
    .insert(input)
    .select("id, name, slug, description, price, price_type, billing_unit, estimated_duration_hours, image_url, is_active, production_steps, created_at, updated_at")
    .single()
    .overrideTypes<AdminService, { merge: false }>();

  if (error) throw error;
  return { ...data, price: Number(data.price) };
}
