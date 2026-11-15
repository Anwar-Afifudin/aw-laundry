import type { OrderPaymentStatus } from "~/features/orders/types";
import { supabase } from "~/lib/supabase/client";

import type { PaymentMethod } from "../types";

type UpdateAdminPaymentInput = {
  orderId: string;
  status: Extract<OrderPaymentStatus, "PENDING" | "PAID" | "FAILED">;
  method: PaymentMethod;
  notes: string | null;
};

export class UpdateAdminPaymentError extends Error {
  constructor() {
    super("Status pembayaran belum dapat diperbarui.");
    this.name = "UpdateAdminPaymentError";
  }
}

export async function updateAdminPayment(input: UpdateAdminPaymentInput) {
  const { error } = await supabase.rpc("update_admin_payment", {
    p_order_id: input.orderId,
    p_status: input.status,
    p_method: input.method,
    p_notes: input.notes,
  });

  if (error) throw new UpdateAdminPaymentError();
}
