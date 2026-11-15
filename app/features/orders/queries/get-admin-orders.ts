import { supabase } from "~/lib/supabase/client";

import type {
  AdminOrderSummary,
  OrderIntakeMethod,
  OrderPaymentStatus,
  OrderPriceType,
  OrderReturnMethod,
  OrderStatus,
  ServiceBillingUnit,
} from "../types";

type AdminOrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  created_at: string;
  estimated_completion_at: string | null;
  estimated_total: number;
  final_total: number;
  intake_method: OrderIntakeMethod;
  return_method: OrderReturnMethod;
  customer: { full_name: string } | null;
  order_items: Array<{
    id: string;
    service_name_snapshot: string;
    price_type_snapshot: OrderPriceType;
    billing_unit_snapshot: ServiceBillingUnit;
    estimated_quantity: number | null;
    actual_quantity: number | null;
    actual_item_count: number | null;
  }>;
};

export class GetAdminOrdersError extends Error {
  constructor() {
    super("Daftar pesanan admin belum dapat dimuat.");
    this.name = "GetAdminOrdersError";
  }
}

export async function getAdminOrders(): Promise<AdminOrderSummary[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new GetAdminOrdersError();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, payment_status, created_at,
      estimated_completion_at, estimated_total, final_total, intake_method, return_method,
      customer:profiles!orders_customer_id_fkey (full_name),
      order_items (
        id, service_name_snapshot, price_type_snapshot, billing_unit_snapshot,
        estimated_quantity, actual_quantity, actual_item_count
      )
    `)
    .order("created_at", { ascending: false })
    .overrideTypes<AdminOrderRow[], { merge: false }>();

  if (error || !data) throw new GetAdminOrdersError();

  return data.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer?.full_name ?? "Customer tidak tersedia",
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    estimatedCompletionAt: order.estimated_completion_at,
    estimatedTotal: Number(order.estimated_total),
    finalTotal: Number(order.final_total),
    intakeMethod: order.intake_method,
    returnMethod: order.return_method,
    items: order.order_items.map((item) => ({
      id: item.id,
      serviceName: item.service_name_snapshot,
      priceType: item.price_type_snapshot,
      billingUnit: item.billing_unit_snapshot,
      estimatedQuantity:
        item.estimated_quantity === null
          ? null
          : Number(item.estimated_quantity),
      actualQuantity:
        item.actual_quantity === null ? null : Number(item.actual_quantity),
      actualItemCount: item.actual_item_count,
    })),
  }));
}
