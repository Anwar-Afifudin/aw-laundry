import type { OrderStatus } from "~/features/orders/types";

export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type ComplaintCategory =
  | "SERVICE_QUALITY"
  | "ITEM_DAMAGE"
  | "ITEM_LOST"
  | "PICKUP_DELIVERY"
  | "BILLING"
  | "OTHER";

export type ComplaintStatusHistory = {
  id: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
};

export type CustomerComplaint = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerComplaintDetail = CustomerComplaint & {
  statusHistory: ComplaintStatusHistory[];
};

export type AdminComplaint = CustomerComplaint & {
  customerName: string;
  customerPhone: string | null;
};

export type AdminComplaintDetail = AdminComplaint & {
  statusHistory: ComplaintStatusHistory[];
};

export type ComplaintOrderOption = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
};

export type CreateCustomerComplaintInput = {
  orderId: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
};
