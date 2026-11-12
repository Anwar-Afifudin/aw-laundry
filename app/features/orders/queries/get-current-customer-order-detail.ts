import { supabase } from "~/lib/supabase/client";

import type {
  CustomerOrderDetail,
  OrderAddressSnapshot,
  OrderIntakeMethod,
  OrderPaymentStatus,
  OrderPriceType,
  OrderReturnMethod,
  OrderStatus,
} from "../types";

type AddressSnapshotRow = {
  label?: unknown;
  recipient_name?: unknown;
  phone?: unknown;
  address_line?: unknown;
  district?: unknown;
  city?: unknown;
  postal_code?: unknown;
  notes?: unknown;
};

type CustomerOrderDetailRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  created_at: string;
  estimated_completion_at: string | null;
  actual_completion_at: string | null;
  special_instructions: string | null;
  estimated_subtotal: number;
  final_subtotal: number;
  pickup_fee: number;
  delivery_fee: number;
  discount_amount: number;
  additional_charge: number;
  estimated_total: number;
  final_total: number;
  intake_method: OrderIntakeMethod;
  return_method: OrderReturnMethod;
  pickup_address_snapshot: AddressSnapshotRow | null;
  delivery_address_snapshot: AddressSnapshotRow | null;
  order_items: Array<{
    id: string;
    service_name_snapshot: string;
    price_type_snapshot: OrderPriceType;
    unit_price_snapshot: number;
    estimated_quantity: number | null;
    actual_quantity: number | null;
    estimated_subtotal: number;
    final_subtotal: number;
    notes: string | null;
  }>;
  order_status_history: Array<{
    id: string;
    to_status: OrderStatus;
    note: string | null;
    created_at: string;
  }>;
};

export type CustomerOrderDetailResult =
  | { status: "found"; order: CustomerOrderDetail }
  | { status: "not_found" };

export class GetCustomerOrderDetailError extends Error {
  constructor() {
    super("Detail pesanan customer belum dapat dimuat.");
    this.name = "GetCustomerOrderDetailError";
  }
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseAddressSnapshot(value: AddressSnapshotRow | null): OrderAddressSnapshot | null {
  if (!value) return null;

  const recipientName = optionalString(value.recipient_name);
  const phone = optionalString(value.phone);
  const addressLine = optionalString(value.address_line);
  if (!recipientName || !phone || !addressLine) return null;

  return {
    label: optionalString(value.label),
    recipientName,
    phone,
    addressLine,
    district: optionalString(value.district),
    city: optionalString(value.city),
    postalCode: optionalString(value.postal_code),
    notes: optionalString(value.notes),
  };
}

export async function getCurrentCustomerOrderDetail(
  orderId: string,
): Promise<CustomerOrderDetailResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new GetCustomerOrderDetailError();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, payment_status, created_at,
      estimated_completion_at, actual_completion_at, special_instructions,
      estimated_subtotal, final_subtotal, pickup_fee, delivery_fee,
      discount_amount, additional_charge, estimated_total, final_total,
      intake_method, return_method, pickup_address_snapshot,
      delivery_address_snapshot,
      order_items (
        id, service_name_snapshot, price_type_snapshot, unit_price_snapshot,
        estimated_quantity, actual_quantity, estimated_subtotal,
        final_subtotal, notes
      ),
      order_status_history (
        id, to_status, note, created_at
      )
    `)
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .order("created_at", { referencedTable: "order_status_history", ascending: true })
    .maybeSingle()
    .overrideTypes<CustomerOrderDetailRow | null, { merge: false }>();

  if (error) throw new GetCustomerOrderDetailError();
  if (!data) return { status: "not_found" };

  return {
    status: "found",
    order: {
      id: data.id,
      orderNumber: data.order_number,
      status: data.status,
      paymentStatus: data.payment_status,
      createdAt: data.created_at,
      estimatedCompletionAt: data.estimated_completion_at,
      actualCompletionAt: data.actual_completion_at,
      specialInstructions: data.special_instructions,
      estimatedSubtotal: Number(data.estimated_subtotal),
      finalSubtotal: Number(data.final_subtotal),
      pickupFee: Number(data.pickup_fee),
      deliveryFee: Number(data.delivery_fee),
      discountAmount: Number(data.discount_amount),
      additionalCharge: Number(data.additional_charge),
      estimatedTotal: Number(data.estimated_total),
      finalTotal: Number(data.final_total),
      intakeMethod: data.intake_method,
      returnMethod: data.return_method,
      pickupAddress: parseAddressSnapshot(data.pickup_address_snapshot),
      deliveryAddress: parseAddressSnapshot(data.delivery_address_snapshot),
      items: data.order_items.map((item) => ({
        id: item.id,
        serviceName: item.service_name_snapshot,
        priceType: item.price_type_snapshot,
        unitPrice: Number(item.unit_price_snapshot),
        estimatedQuantity: item.estimated_quantity === null ? null : Number(item.estimated_quantity),
        actualQuantity: item.actual_quantity === null ? null : Number(item.actual_quantity),
        estimatedSubtotal: Number(item.estimated_subtotal),
        finalSubtotal: Number(item.final_subtotal),
        notes: item.notes,
      })),
      statusHistory: data.order_status_history.map((event) => ({
        id: event.id,
        status: event.to_status,
        note: event.note,
        createdAt: event.created_at,
      })),
    },
  };
}
