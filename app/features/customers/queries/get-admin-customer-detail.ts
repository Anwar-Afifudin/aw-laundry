import { supabase } from "~/lib/supabase/client";

import type { AdminCustomerDetailResult } from "../types";
import { mapCustomerDetail, type CustomerProfileRow } from "./customer-query-mappers";

export class GetAdminCustomerDetailError extends Error {
  constructor() {
    super("Detail pelanggan belum dapat dimuat.");
    this.name = "GetAdminCustomerDetailError";
  }
}

export async function getAdminCustomerDetail(customerId: string): Promise<AdminCustomerDetailResult> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetAdminCustomerDetailError();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, full_name, phone, is_active, created_at,
      orders (
        id, order_number, status, payment_status, estimated_total, final_total, created_at,
        pickup_address_snapshot, delivery_address_snapshot,
        order_items (service_name_snapshot),
        payments (amount, status)
      )
    `)
    .eq("id", customerId)
    .eq("role", "CUSTOMER")
    .maybeSingle()
    .overrideTypes<CustomerProfileRow | null, { merge: false }>();

  if (error) throw new GetAdminCustomerDetailError();
  return data ? { status: "found", customer: mapCustomerDetail(data) } : { status: "not_found" };
}
