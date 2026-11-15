import { supabase } from "~/lib/supabase/client";

import type { AdminCustomersData } from "../types";
import { mapCustomerSummary, type CustomerProfileRow } from "./customer-query-mappers";

export class GetAdminCustomersError extends Error {
  constructor() {
    super("Daftar pelanggan belum dapat dimuat.");
    this.name = "GetAdminCustomersError";
  }
}

export async function getAdminCustomers(): Promise<AdminCustomersData> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetAdminCustomersError();

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
    .eq("role", "CUSTOMER")
    .order("created_at", { ascending: false })
    .overrideTypes<CustomerProfileRow[], { merge: false }>();

  if (error || !data) throw new GetAdminCustomersError();
  const customers = data.map(mapCustomerSummary);
  return {
    customers,
    totalCustomers: customers.length,
    activeCustomers: customers.filter((customer) => customer.isActive).length,
    totalOrders: customers.reduce((total, customer) => total + customer.orderCount, 0),
    paidTransactionTotal: customers.reduce((total, customer) => total + customer.paidTransactionTotal, 0),
  };
}
