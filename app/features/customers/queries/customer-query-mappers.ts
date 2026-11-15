import type { OrderPaymentStatus, OrderStatus } from "~/features/orders/types";

import type { AdminCustomerDetail, AdminCustomerSummary, CustomerOrderHistoryItem } from "../types";

export type CustomerPaymentRow = { amount: number; status: OrderPaymentStatus };
type AddressSnapshotRow = Record<string, unknown>;

export type CustomerOrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  estimated_total: number;
  final_total: number;
  created_at: string;
  pickup_address_snapshot: AddressSnapshotRow | null;
  delivery_address_snapshot: AddressSnapshotRow | null;
  order_items: Array<{ service_name_snapshot: string }>;
  payments: CustomerPaymentRow[];
};

export type CustomerProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  orders: CustomerOrderRow[];
};

const terminalStatuses = new Set<OrderStatus>(["COMPLETED", "CANCELLED"]);

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseAddressSnapshot(value: AddressSnapshotRow | null) {
  if (!value) return null;
  const addressLine = optionalText(value.address_line);
  const district = optionalText(value.district);
  const city = optionalText(value.city);
  const postalCode = optionalText(value.postal_code);
  if (!addressLine && !district && !city && !postalCode) return null;
  return {
    label: optionalText(value.label),
    recipientName: optionalText(value.recipient_name) ?? "",
    phone: optionalText(value.phone) ?? "",
    addressLine: addressLine ?? "",
    district,
    city,
    postalCode,
  };
}

export function getPaidTotal(order: CustomerOrderRow) {
  if (order.status === "CANCELLED" || order.payment_status !== "PAID") return 0;
  const paidPayment = order.payments.find((payment) => payment.status === "PAID");
  return paidPayment ? Number(paidPayment.amount) : 0;
}

export function mapCustomerSummary(profile: CustomerProfileRow): AdminCustomerSummary {
  const orders = [...profile.orders].sort((left, right) => right.created_at.localeCompare(left.created_at));
  return {
    id: profile.id,
    fullName: profile.full_name,
    // Email lives in auth.users and is intentionally not exposed by the browser client.
    email: null,
    phone: profile.phone,
    isActive: profile.is_active,
    joinedAt: profile.created_at,
    orderCount: orders.length,
    paidTransactionTotal: orders.reduce((total, order) => total + getPaidTotal(order), 0),
    lastOrderAt: orders[0]?.created_at ?? null,
  };
}

export function mapOrder(order: CustomerOrderRow): CustomerOrderHistoryItem {
  return {
    id: order.id,
    orderNumber: order.order_number,
    services: order.order_items.map((item) => item.service_name_snapshot),
    estimatedTotal: Number(order.estimated_total),
    finalTotal: Number(order.final_total),
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    paidAmount: getPaidTotal(order),
  };
}

export function mapCustomerDetail(profile: CustomerProfileRow): AdminCustomerDetail {
  const orders = [...profile.orders].sort((left, right) => right.created_at.localeCompare(left.created_at));
  const latestAddress = orders
    .map((order) => parseAddressSnapshot(order.delivery_address_snapshot ?? order.pickup_address_snapshot))
    .find((address) => address !== null) ?? null;

  return {
    ...mapCustomerSummary({ ...profile, orders }),
    address: latestAddress,
    completedOrderCount: orders.filter((order) => order.status === "COMPLETED").length,
    activeOrderCount: orders.filter((order) => !terminalStatuses.has(order.status)).length,
    orders: orders.map(mapOrder),
  };
}
