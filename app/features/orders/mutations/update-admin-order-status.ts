import { supabase } from "~/lib/supabase/client";
import type { OrderStatus } from "../types";

export class UpdateAdminOrderStatusError extends Error { constructor() { super("Status pesanan belum dapat diperbarui."); this.name = "UpdateAdminOrderStatusError"; } }

export async function updateAdminOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.rpc("update_admin_order_status", { p_order_id: orderId, p_to_status: status });
  if (error) throw new UpdateAdminOrderStatusError();
}
