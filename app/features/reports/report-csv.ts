import { getOrderDisplayTotal } from "~/features/orders/order-display";
import { orderStatusLabels } from "~/features/orders/order-display";
import { paymentMethodLabels, paymentStatusLabels } from "~/features/payments/payment-display";
import type { ReportOrder } from "./types";

const csvDate = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" });
const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
export function createOrdersCsv(orders: ReportOrder[]) {
  const header = ["order_number", "customer_name", "service", "actual_quantity", "actual_item_count", "billing_unit", "final_total", "order_status", "payment_status", "payment_method", "payment_date"];
  const rows = orders.flatMap((order) => { const paid = order.payments.find((payment) => payment.status === "PAID"); return order.items.map((item) => [order.orderNumber, order.customerName, item.serviceName, item.actualQuantity ?? "", item.actualItemCount ?? "", item.billingUnit, getOrderDisplayTotal(order), orderStatusLabels[order.status], paymentStatusLabels[order.paymentStatus], paid ? paymentMethodLabels[paid.method] : "-", paid?.paidAt ? csvDate.format(new Date(paid.paidAt)) : "-"]); });
  return `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
}
export function downloadOrdersCsv(orders: ReportOrder[], filename: string) { const url = URL.createObjectURL(new Blob([createOrdersCsv(orders)], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
