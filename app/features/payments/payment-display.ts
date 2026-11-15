import type { OrderPaymentStatus } from "~/features/orders/types";

import type { PaymentMethod } from "./types";

export const paymentStatusLabels: Record<OrderPaymentStatus, string> = {
  UNPAID: "Belum dibayar",
  PENDING: "Menunggu verifikasi",
  PAID: "Lunas",
  FAILED: "Gagal",
  REFUNDED: "Dikembalikan",
};

export const paymentStatusStyles: Record<OrderPaymentStatus, string> = {
  UNPAID: "bg-amber-50 text-amber-700 ring-amber-200",
  PENDING: "bg-blue-50 text-blue-700 ring-blue-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  REFUNDED: "bg-slate-100 text-slate-700 ring-slate-200",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  BANK_TRANSFER: "Transfer bank",
  QRIS: "QRIS",
  COD: "Bayar di tempat (COD)",
};
