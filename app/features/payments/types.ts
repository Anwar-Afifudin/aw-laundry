import type { OrderPaymentStatus, OrderStatus } from "~/features/orders/types";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QRIS" | "COD";

export type AdminPaymentTransaction = {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: OrderPaymentStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type AdminPaymentSummary = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  estimatedTotal: number;
  finalTotal: number;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderStatus;
  orderCreatedAt: string;
  transactionCount: number;
  latestPayment: AdminPaymentTransaction | null;
  paidAmount: number | null;
};

export type AdminPaymentDetail = AdminPaymentSummary & {
  customerPhone: string;
  orderStatus: OrderStatus;
  estimatedSubtotal: number;
  finalSubtotal: number;
  payments: AdminPaymentTransaction[];
};
