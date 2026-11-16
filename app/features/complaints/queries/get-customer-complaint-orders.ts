import { supabase } from "~/lib/supabase/client";

import type { OrderStatus } from "~/features/orders/types";

import type { ComplaintOrderOption } from "../types";

type ComplaintOrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
};

export class GetCustomerComplaintOrdersError extends Error {
  constructor() {
    super("Daftar pesanan belum dapat dimuat.");
    this.name = "GetCustomerComplaintOrdersError";
  }
}

export async function getCustomerComplaintOrders(): Promise<ComplaintOrderOption[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetCustomerComplaintOrdersError();

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .overrideTypes<ComplaintOrderRow[], { merge: false }>();

  if (error || !data) throw new GetCustomerComplaintOrdersError();

  return data.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    createdAt: order.created_at,
  }));
}
