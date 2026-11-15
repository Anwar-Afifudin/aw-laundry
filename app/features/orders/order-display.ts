import type { CustomerOrderItemSummary, OrderStatus, ServiceBillingUnit } from "./types";

export const orderStatusLabels: Record<OrderStatus, string> = {
  ORDER_CREATED: "Pesanan dibuat",
  WAITING_PICKUP: "Menunggu penjemputan",
  PICKED_UP: "Laundry dijemput",
  RECEIVED: "Laundry diterima",
  WEIGHING: "Sedang ditimbang",
  WAITING_PROCESS: "Menunggu diproses",
  WASHING: "Sedang dicuci",
  DRYING: "Sedang dikeringkan",
  IRONING: "Sedang disetrika",
  QUALITY_CONTROL: "Pemeriksaan kualitas",
  PACKING: "Sedang dikemas",
  READY: "Siap dikembalikan",
  OUT_FOR_DELIVERY: "Dalam pengantaran",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const orderStatusStyles: Record<OrderStatus, string> = {
  ORDER_CREATED: "bg-blue-50 text-blue-700 ring-blue-200",
  WAITING_PICKUP: "bg-amber-50 text-amber-700 ring-amber-200",
  PICKED_UP: "bg-sky-50 text-sky-700 ring-sky-200",
  RECEIVED: "bg-sky-50 text-sky-700 ring-sky-200",
  WEIGHING: "bg-violet-50 text-violet-700 ring-violet-200",
  WAITING_PROCESS: "bg-amber-50 text-amber-700 ring-amber-200",
  WASHING: "bg-blue-50 text-blue-700 ring-blue-200",
  DRYING: "bg-blue-50 text-blue-700 ring-blue-200",
  IRONING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  QUALITY_CONTROL: "bg-violet-50 text-violet-700 ring-violet-200",
  PACKING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  READY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  OUT_FOR_DELIVERY: "bg-sky-50 text-sky-700 ring-sky-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "Asia/Jakarta",
});
const quantityFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

export const billingUnitLabels: Record<ServiceBillingUnit, string> = {
  KG: "kg",
  PAIR: "pasang",
  PCS: "pcs",
  M2: "m²",
};

export const billingQuantityLabels: Record<ServiceBillingUnit, string> = {
  KG: "Berat aktual",
  PAIR: "Jumlah aktual",
  PCS: "Jumlah aktual",
  M2: "Luas aktual",
};

export const billingEstimateLabels: Record<ServiceBillingUnit, string> = {
  KG: "Estimasi berat",
  PAIR: "Estimasi jumlah",
  PCS: "Estimasi jumlah",
  M2: "Estimasi luas",
};

export function formatRupiah(value: number) {
  return rupiahFormatter.format(value);
}

export function getOrderDisplayTotal(order: {
  estimatedTotal: number;
  finalTotal: number;
}) {
  return order.finalTotal > 0 ? order.finalTotal : order.estimatedTotal;
}

export function formatOrderDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatOrderQuantity(item?: CustomerOrderItemSummary) {
  if (!item) return "Belum tersedia";
  const quantity = item.actualQuantity ?? item.estimatedQuantity;
  if (quantity === null) return "Belum tersedia";
  return formatBillingQuantity(
    quantity,
    item.billingUnit,
    item.actualQuantity === null ? null : item.actualItemCount,
  );
}

export function formatBillingQuantity(
  value: number,
  unit: ServiceBillingUnit,
  actualItemCount: number | null = null,
) {
  const quantity = `${quantityFormatter.format(value)} ${billingUnitLabels[unit]}`;
  return unit === "KG" && actualItemCount !== null
    ? `${quantity} · ${quantityFormatter.format(actualItemCount)} pcs`
    : quantity;
}

export function formatOrderItemCount(item?: CustomerOrderItemSummary) {
  if (!item || item.billingUnit !== "KG" || item.actualItemCount === null) return null;
  return `${quantityFormatter.format(item.actualItemCount)} pcs`;
}
