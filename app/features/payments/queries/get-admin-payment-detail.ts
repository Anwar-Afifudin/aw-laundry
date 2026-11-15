import type {
  OrderPaymentStatus,
  OrderStatus,
} from "~/features/orders/types";
import { supabase } from "~/lib/supabase/client";

import type { AdminPaymentDetail, PaymentMethod } from "../types";
import { mapPayment } from "./get-admin-payments";

type AdminPaymentDetailRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  created_at: string;
  estimated_subtotal: number;
  final_subtotal: number;
  estimated_total: number;
  final_total: number;
  customer: { full_name: string; phone: string } | null;
  payments: Array<{
    id: string;
    amount: number;
    method: PaymentMethod;
    status: OrderPaymentStatus;
    paid_at: string | null;
    notes: string | null;
    created_at: string;
  }>;
};

export type AdminPaymentDetailResult =
  | { status: "found"; payment: AdminPaymentDetail }
  | { status: "not_found" };

export class GetAdminPaymentDetailError extends Error {
  constructor() {
    super("Detail pembayaran belum dapat dimuat.");
    this.name = "GetAdminPaymentDetailError";
  }
}

export async function getAdminPaymentDetail(
  orderId: string,
): Promise<AdminPaymentDetailResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new GetAdminPaymentDetailError();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, payment_status, created_at,
      estimated_subtotal, final_subtotal, estimated_total, final_total,
      customer:profiles!orders_customer_id_fkey (full_name, phone),
      payments (id, amount, method, status, paid_at, notes, created_at)
    `)
    .eq("id", orderId)
    .maybeSingle()
    .overrideTypes<AdminPaymentDetailRow | null, { merge: false }>();

  if (error) throw new GetAdminPaymentDetailError();
  if (!data) return { status: "not_found" };
  if (!data.customer) throw new GetAdminPaymentDetailError();

  const payments = data.payments
    .map(mapPayment)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    status: "found",
    payment: {
      orderId: data.id,
      orderNumber: data.order_number,
      customerName: data.customer.full_name,
      customerPhone: data.customer.phone,
      orderStatus: data.status,
      estimatedSubtotal: Number(data.estimated_subtotal),
      finalSubtotal: Number(data.final_subtotal),
      estimatedTotal: Number(data.estimated_total),
      finalTotal: Number(data.final_total),
      paymentStatus: data.payment_status,
      orderCreatedAt: data.created_at,
      transactionCount: payments.length,
      latestPayment: payments[0] ?? null,
      paidAmount: payments.find((payment) => payment.status === "PAID")?.amount ?? null,
      payments,
    },
  };
}
