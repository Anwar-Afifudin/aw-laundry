import type { ServiceBillingUnit } from "~/features/orders/types";
import type { PaymentMethod } from "~/features/payments/types";
import type { AdminReport, AdminReportSource, ReportDateRange, RevenuePoint, ServiceReportRow } from "./types";

const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const dayLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" });
const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" });
const monthLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", month: "short", year: "numeric" });
function daysBetween(range: ReportDateRange) { return Math.round((new Date(range.endExclusiveIso).getTime() - new Date(range.startIso).getTime()) / 86400000); }
function revenuePoints(source: AdminReportSource, range: ReportDateRange): RevenuePoint[] {
  const monthly = daysBetween(range) > 62; const grouped = new Map<string, number>();
  for (const transaction of source.paidTransactions) { const date = new Date(transaction.paidAt); const key = monthly ? monthKey.format(date) : dateKey.format(date); grouped.set(key, (grouped.get(key) ?? 0) + transaction.amount); }
  if (monthly) return [...grouped].map(([key, amount]) => ({ key, amount, label: monthLabel.format(new Date(`${key}-01T12:00:00+07:00`)) }));
  const points: RevenuePoint[] = []; for (let cursor = new Date(range.startIso); cursor < new Date(range.endExclusiveIso); cursor = new Date(cursor.getTime() + 86400000)) { const key = dateKey.format(cursor); points.push({ key, amount: grouped.get(key) ?? 0, label: dayLabel.format(cursor) }); } return points;
}
function serviceRows(source: AdminReportSource, totalRevenue: number): ServiceReportRow[] {
  const rows = new Map<string, { orders: Set<string>; quantities: Partial<Record<ServiceBillingUnit, number>>; revenue: number }>();
    for (const transaction of source.paidTransactions) { const subtotal = transaction.items.reduce((sum, item) => sum + item.finalSubtotal, 0); for (const item of transaction.items) { const current = rows.get(item.serviceName) ?? { orders: new Set<string>(), quantities: {}, revenue: 0 }; current.orders.add(transaction.orderId); if (item.actualQuantity !== null) current.quantities[item.billingUnit] = (current.quantities[item.billingUnit] ?? 0) + item.actualQuantity; current.revenue += subtotal > 0 ? transaction.amount * item.finalSubtotal / subtotal : transaction.amount / Math.max(transaction.items.length, 1); rows.set(item.serviceName, current); } }
  return [...rows].map(([serviceName, row]) => ({ serviceName, orderCount: row.orders.size, quantities: row.quantities, revenue: row.revenue, contribution: totalRevenue > 0 ? row.revenue / totalRevenue * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);
}
export function calculateAdminReport(source: AdminReportSource, range: ReportDateRange): AdminReport {
  const totalRevenue = source.paidTransactions.reduce((sum, transaction) => sum + transaction.amount, 0); const methods = Object.fromEntries((["CASH", "BANK_TRANSFER", "QRIS", "COD"] satisfies PaymentMethod[]).map((method) => [method, { count: 0, amount: 0 }])) as AdminReport["paymentMethods"];
  for (const transaction of source.paidTransactions) { methods[transaction.method].count += 1; methods[transaction.method].amount += transaction.amount; }
  return { totalOrders: source.orders.length, completedOrders: source.orders.filter((order) => order.status === "COMPLETED").length, cancelledOrders: source.orders.filter((order) => order.status === "CANCELLED").length, totalRevenue, averageTransaction: source.paidTransactions.length ? totalRevenue / source.paidTransactions.length : 0, revenuePoints: revenuePoints(source, range), paymentMethods: methods, services: serviceRows(source, totalRevenue), orders: source.orders };
}
