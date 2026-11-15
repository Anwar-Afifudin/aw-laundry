import { supabase } from "~/lib/supabase/client";
import type { OrderPaymentStatus, OrderStatus, ServiceBillingUnit } from "~/features/orders/types";
import type { PaymentMethod } from "~/features/payments/types";
import type { AdminReportSource, PaidReportTransaction, ReportDateRange, ReportOrder } from "../types";

type ItemRow = { id: string; service_name_snapshot: string; billing_unit_snapshot: ServiceBillingUnit; actual_quantity: number | null; actual_item_count: number | null; final_subtotal: number };
type PaymentRow = { id: string; amount: number; method: PaymentMethod; status: OrderPaymentStatus; paid_at: string | null; created_at: string };
type OrderRow = { id: string; order_number: string; status: OrderStatus; payment_status: OrderPaymentStatus; created_at: string; estimated_total: number; final_total: number; customer: { full_name: string } | null; order_items: ItemRow[]; payments: PaymentRow[] };
type PaidRow = PaymentRow & { order_id: string; order: { status: OrderStatus; order_items: ItemRow[] } | null };
const mapItem = (item: ItemRow) => ({ id: item.id, serviceName: item.service_name_snapshot, billingUnit: item.billing_unit_snapshot, actualQuantity: item.actual_quantity === null ? null : Number(item.actual_quantity), actualItemCount: item.actual_item_count, finalSubtotal: Number(item.final_subtotal) });

export async function getAdminReportSource(range: ReportDateRange): Promise<AdminReportSource> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("REPORT_AUTH_REQUIRED");
  const [ordersResult, paymentsResult] = await Promise.all([
    supabase.from("orders").select(`id, order_number, status, payment_status, created_at, estimated_total, final_total, customer:profiles!orders_customer_id_fkey (full_name), order_items (id, service_name_snapshot, billing_unit_snapshot, actual_quantity, actual_item_count, final_subtotal), payments (id, amount, method, status, paid_at, created_at)`).gte("created_at", range.startIso).lt("created_at", range.endExclusiveIso).order("created_at", { ascending: false }).overrideTypes<OrderRow[], { merge: false }>(),
    supabase.from("payments").select(`id, order_id, amount, method, status, paid_at, created_at, order:orders!payments_order_id_fkey (status, order_items (id, service_name_snapshot, billing_unit_snapshot, actual_quantity, actual_item_count, final_subtotal))`).eq("status", "PAID").gte("paid_at", range.startIso).lt("paid_at", range.endExclusiveIso).order("paid_at", { ascending: false }).overrideTypes<PaidRow[], { merge: false }>(),
  ]);
  if (ordersResult.error || paymentsResult.error || !ordersResult.data || !paymentsResult.data) throw new Error("REPORT_READ_FAILED");
  const orders: ReportOrder[] = ordersResult.data.map((order) => ({ id: order.id, orderNumber: order.order_number, customerName: order.customer?.full_name ?? "Customer tidak tersedia", status: order.status, paymentStatus: order.payment_status, createdAt: order.created_at, estimatedTotal: Number(order.estimated_total), finalTotal: Number(order.final_total), items: order.order_items.map(mapItem), payments: order.payments.map((payment) => ({ id: payment.id, amount: Number(payment.amount), method: payment.method, status: payment.status, paidAt: payment.paid_at, createdAt: payment.created_at })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
  const seenOrders = new Set<string>();
  const paidTransactions: PaidReportTransaction[] = [];
  for (const payment of paymentsResult.data) { if (!payment.order || !payment.paid_at || payment.order.status === "CANCELLED" || seenOrders.has(payment.order_id)) continue; seenOrders.add(payment.order_id); paidTransactions.push({ id: payment.id, orderId: payment.order_id, amount: Number(payment.amount), method: payment.method, paidAt: payment.paid_at, orderStatus: payment.order.status, items: payment.order.order_items.map(mapItem) }); }
  return { orders, paidTransactions };
}
