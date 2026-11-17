import { supabase } from "~/lib/supabase/client";

import type { BusinessSettings } from "../types";

type BusinessSettingsRow = Omit<
  BusinessSettings,
  "pickup_fee" | "delivery_fee" | "minimum_order"
> & {
  pickup_fee: number | string;
  delivery_fee: number | string;
  minimum_order: number | string;
};

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const { data, error } = await supabase
    .from("business_settings")
    .select(`
      id, business_name, phone, email, address, opening_time, closing_time,
      pickup_enabled, delivery_enabled, pickup_fee, delivery_fee, minimum_order,
      created_at, updated_at
    `)
    .eq("id", 1)
    .single()
    .overrideTypes<BusinessSettingsRow, { merge: false }>();

  if (error) throw error;

  return {
    ...data,
    pickup_fee: Number(data.pickup_fee),
    delivery_fee: Number(data.delivery_fee),
    minimum_order: Number(data.minimum_order),
  };
}
