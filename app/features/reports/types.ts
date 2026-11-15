import type { OrderPaymentStatus, OrderStatus, ServiceBillingUnit } from "~/features/orders/types";
import type { PaymentMethod } from "~/features/payments/types";

export type ReportPreset = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";
export type ReportDateRange = { startDate: string; endDate: string; startIso: string; endExclusiveIso: string };
export type ReportOrderItem = { id: string; serviceName: string; billingUnit: ServiceBillingUnit; actualQuantity: number | null; actualItemCount: number | null; finalSubtotal: number };
export type ReportPayment = { id: string; amount: number; method: PaymentMethod; status: OrderPaymentStatus; paidAt: string | null; createdAt: string };
export type ReportOrder = { id: string; orderNumber: string; customerName: string; status: OrderStatus; paymentStatus: OrderPaymentStatus; createdAt: string; estimatedTotal: number; finalTotal: number; items: ReportOrderItem[]; payments: ReportPayment[] };
export type PaidReportTransaction = { id: string; orderId: string; amount: number; method: PaymentMethod; paidAt: string; orderStatus: OrderStatus; items: ReportOrderItem[] };
export type AdminReportSource = { orders: ReportOrder[]; paidTransactions: PaidReportTransaction[] };
export type RevenuePoint = { key: string; label: string; amount: number };
export type ServiceReportRow = { serviceName: string; orderCount: number; quantities: Partial<Record<ServiceBillingUnit, number>>; revenue: number; contribution: number };
export type AdminReport = { totalOrders: number; completedOrders: number; cancelledOrders: number; totalRevenue: number; averageTransaction: number; revenuePoints: RevenuePoint[]; paymentMethods: Record<PaymentMethod, { count: number; amount: number }>; services: ServiceReportRow[]; orders: ReportOrder[] };
