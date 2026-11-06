import { supabase } from "~/lib/supabase/client";

import type { ActiveService } from "../types";

export async function getActiveServices(): Promise<ActiveService[]> {
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, slug, description, price, price_type, estimated_duration_hours, image_url",
    )
    .eq("is_active", true)
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<ActiveService[], { merge: false }>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
