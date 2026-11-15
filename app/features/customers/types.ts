import type { OrderPaymentStatus, OrderStatus } from "~/features/orders/types";

export type CustomerAddressSummary = {
  label: string | null;
  recipientName: string;
  phone: string;
  addressLine: string;
  district: string | null;
  city: string | null;
  postalCode: string | null;
};

export type CustomerOrderHistoryItem = {
  id: string;
  orderNumber: string;
  services: string[];
  estimatedTotal: number;
  finalTotal: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  createdAt: string;
  paidAmount: number;
};

export type AdminCustomerSummary = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  joinedAt: string;
  orderCount: number;
  paidTransactionTotal: number;
  lastOrderAt: string | null;
};

export type AdminCustomersData = {
  customers: AdminCustomerSummary[];
  totalCustomers: number;
  activeCustomers: number;
  totalOrders: number;
  paidTransactionTotal: number;
};

export type AdminCustomerDetail = AdminCustomerSummary & {
  address: CustomerAddressSummary | null;
  completedOrderCount: number;
  activeOrderCount: number;
  orders: CustomerOrderHistoryItem[];
};

export type AdminCustomerDetailResult =
  | { status: "found"; customer: AdminCustomerDetail }
  | { status: "not_found" };
