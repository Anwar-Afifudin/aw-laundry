import { getAdminOrders } from "~/features/orders/queries/get-admin-orders";
import type { AdminOrderSummary } from "~/features/orders/types";
import { calculateAdminPaidRevenue } from "~/features/payments/payment-totals";
import { getAdminPayments } from "~/features/payments/queries/get-admin-payments";
import { supabase } from "~/lib/supabase/client";

export type AdminDashboardData = {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  activeCustomers: number;
  totalRevenue: number;
  recentOrders: AdminOrderSummary[];
};

export class GetAdminDashboardError extends Error {
  constructor() {
    super("Dashboard admin belum dapat dimuat.");
    this.name = "GetAdminDashboardError";
  }
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [orders, payments, customerResult] = await Promise.all([
    getAdminOrders(),
    getAdminPayments(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "CUSTOMER")
      .eq("is_active", true),
  ]);

  if (customerResult.error || customerResult.count === null) {
    throw new GetAdminDashboardError();
  }

  return {
    totalOrders: orders.length,
    activeOrders: orders.filter(
      (order) => order.status !== "COMPLETED" && order.status !== "CANCELLED",
    ).length,
    completedOrders: orders.filter((order) => order.status === "COMPLETED")
      .length,
    activeCustomers: customerResult.count,
    totalRevenue: calculateAdminPaidRevenue(payments),
    recentOrders: orders.slice(0, 5),
  };
}
