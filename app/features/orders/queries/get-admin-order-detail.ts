import { supabase } from "~/lib/supabase/client";
import type { AdminOrderDetail, OrderAddressSnapshot, OrderIntakeMethod, OrderItemProductionStatus, OrderPaymentStatus, OrderPriceType, OrderReturnMethod, OrderStatus, ProductionStatus, ServiceBillingUnit } from "../types";

type AddressRow = Record<string, unknown>;
type AdminOrderDetailRow = {
  id: string; order_number: string; customer_id: string; status: OrderStatus;
  payment_status: OrderPaymentStatus; created_at: string; estimated_completion_at: string | null;
  actual_completion_at: string | null; special_instructions: string | null;
  estimated_subtotal: number; final_subtotal: number; pickup_fee: number; delivery_fee: number;
  discount_amount: number; additional_charge: number; estimated_total: number; final_total: number;
  intake_method: OrderIntakeMethod; return_method: OrderReturnMethod;
  pickup_address_snapshot: AddressRow | null; delivery_address_snapshot: AddressRow | null;
  customer: { id: string; full_name: string; phone: string } | null;
  order_items: Array<{ id: string; service_name_snapshot: string; price_type_snapshot: OrderPriceType; billing_unit_snapshot: ServiceBillingUnit; unit_price_snapshot: number; estimated_quantity: number | null; actual_quantity: number | null; actual_item_count: number | null; estimated_subtotal: number; final_subtotal: number; notes: string | null; production_steps_snapshot: ProductionStatus[]; production_status: OrderItemProductionStatus | null; order_item_status_history: Array<{ id: string; from_status: OrderItemProductionStatus | null; to_status: OrderItemProductionStatus; note: string | null; created_at: string }> }>;
  order_status_history: Array<{ id: string; to_status: OrderStatus; note: string | null; created_at: string }>;
};

export type AdminOrderDetailResult = { status: "found"; order: AdminOrderDetail } | { status: "not_found" };
export class GetAdminOrderDetailError extends Error { constructor() { super("Detail pesanan admin belum dapat dimuat."); this.name = "GetAdminOrderDetailError"; } }

function text(value: unknown) { return typeof value === "string" && value.trim() ? value : null; }
function address(value: AddressRow | null): OrderAddressSnapshot | null {
  if (!value) return null;
  const recipientName = text(value.recipient_name); const phone = text(value.phone); const addressLine = text(value.address_line);
  if (!recipientName || !phone || !addressLine) return null;
  return { label: text(value.label), recipientName, phone, addressLine, district: text(value.district), city: text(value.city), postalCode: text(value.postal_code), notes: text(value.notes) };
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetailResult> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetAdminOrderDetailError();
  const { data, error } = await supabase.from("orders").select(`
    id, order_number, customer_id, status, payment_status, created_at,
    estimated_completion_at, actual_completion_at, special_instructions,
    estimated_subtotal, final_subtotal, pickup_fee, delivery_fee,
    discount_amount, additional_charge, estimated_total, final_total,
    intake_method, return_method, pickup_address_snapshot, delivery_address_snapshot,
    customer:profiles!orders_customer_id_fkey (id, full_name, phone),
    order_items (id, service_name_snapshot, price_type_snapshot, billing_unit_snapshot, unit_price_snapshot,
      estimated_quantity, actual_quantity, actual_item_count, estimated_subtotal, final_subtotal, notes,
      production_steps_snapshot, production_status,
      order_item_status_history (id, from_status, to_status, note, created_at)),
    order_status_history (id, to_status, note, created_at)
  `).eq("id", orderId).order("created_at", { referencedTable: "order_status_history", ascending: true }).maybeSingle()
    .overrideTypes<AdminOrderDetailRow | null, { merge: false }>();
  if (error) throw new GetAdminOrderDetailError();
  if (!data) return { status: "not_found" };
  if (!data.customer) throw new GetAdminOrderDetailError();
  return { status: "found", order: {
    id: data.id, orderNumber: data.order_number, status: data.status, paymentStatus: data.payment_status,
    createdAt: data.created_at, estimatedCompletionAt: data.estimated_completion_at, actualCompletionAt: data.actual_completion_at,
    specialInstructions: data.special_instructions, estimatedSubtotal: Number(data.estimated_subtotal), finalSubtotal: Number(data.final_subtotal),
    pickupFee: Number(data.pickup_fee), deliveryFee: Number(data.delivery_fee), discountAmount: Number(data.discount_amount),
    additionalCharge: Number(data.additional_charge), estimatedTotal: Number(data.estimated_total), finalTotal: Number(data.final_total),
    intakeMethod: data.intake_method, returnMethod: data.return_method, pickupAddress: address(data.pickup_address_snapshot),
    deliveryAddress: address(data.delivery_address_snapshot), customer: { id: data.customer.id, fullName: data.customer.full_name, phone: data.customer.phone },
    items: data.order_items.map((item) => ({ id: item.id, serviceName: item.service_name_snapshot, priceType: item.price_type_snapshot,
      billingUnit: item.billing_unit_snapshot,
      unitPrice: Number(item.unit_price_snapshot), estimatedQuantity: item.estimated_quantity === null ? null : Number(item.estimated_quantity),
      actualQuantity: item.actual_quantity === null ? null : Number(item.actual_quantity), estimatedSubtotal: Number(item.estimated_subtotal),
      actualItemCount: item.actual_item_count,
      finalSubtotal: Number(item.final_subtotal), notes: item.notes, productionSteps: item.production_steps_snapshot,
      productionStatus: item.production_status,
      productionHistory: item.order_item_status_history
        .map((event) => ({ id: event.id, fromStatus: event.from_status, status: event.to_status, note: event.note, createdAt: event.created_at }))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)) })),
    statusHistory: data.order_status_history.map((event) => ({ id: event.id, status: event.to_status, note: event.note, createdAt: event.created_at })),
  }};
}
