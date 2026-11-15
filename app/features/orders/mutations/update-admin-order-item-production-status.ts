import { supabase } from "~/lib/supabase/client";
import type { ProductionStatus } from "../types";

export class UpdateAdminOrderItemProductionStatusError extends Error {
  constructor() {
    super("Status produksi layanan belum dapat diperbarui.");
    this.name = "UpdateAdminOrderItemProductionStatusError";
  }
}

export async function updateAdminOrderItemProductionStatus(
  orderItemId: string,
  status: ProductionStatus,
) {
  const { error } = await supabase.rpc("update_admin_order_item_production_status", {
    p_order_item_id: orderItemId,
    p_to_status: status,
  });

  if (error) throw new UpdateAdminOrderItemProductionStatusError();
}
