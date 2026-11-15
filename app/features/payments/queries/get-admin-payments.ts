import { supabase } from "~/lib/supabase/client";

import type { OrderPaymentStatus, OrderStatus } from "~/features/orders/types";
import type {
  AdminPaymentSummary,
  AdminPaymentTransaction,
  PaymentMethod,
} from "../types";

type PaymentRow = {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: OrderPaymentStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

type AdminPaymentOrderRow = {
  id: string;
  order_number: string;
  estimated_total: number;
  final_total: number;
  payment_status: OrderPaymentStatus;
  status: OrderStatus;
  created_at: string;
  customer: { full_name: string } | null;
  payments: PaymentRow[];
};

export class GetAdminPaymentsError extends Error {
  constructor() {
    super("Daftar pembayaran belum dapat dimuat.");
    this.name = "GetAdminPaymentsError";
  }
}

export function mapPayment(row: PaymentRow): AdminPaymentTransaction {
  return {
    id: row.id,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    paidAt: row.paid_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getAdminPayments(): Promise<AdminPaymentSummary[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new GetAdminPaymentsError();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, estimated_total, final_total, payment_status, status, created_at,
      customer:profiles!orders_customer_id_fkey (full_name),
      payments (id, amount, method, status, paid_at, notes, created_at)
    `)
    .order("created_at", { ascending: false })
    .overrideTypes<AdminPaymentOrderRow[], { merge: false }>();

  if (error || !data) throw new GetAdminPaymentsError();

  return data.map((order) => {
    const payments = order.payments
      .map(mapPayment)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: order.customer?.full_name ?? "Customer tidak tersedia",
      estimatedTotal: Number(order.estimated_total),
      finalTotal: Number(order.final_total),
      paymentStatus: order.payment_status,
      orderStatus: order.status,
      orderCreatedAt: order.created_at,
      transactionCount: payments.length,
      latestPayment: payments[0] ?? null,
      paidAmount: payments.find((payment) => payment.status === "PAID")?.amount ?? null,
    };
  });
}
