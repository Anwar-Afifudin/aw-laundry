import { supabase } from "~/lib/supabase/client";

import type {
  ComplaintCategory,
  ComplaintStatus,
  CustomerComplaintDetail,
} from "../types";

type CustomerComplaintDetailRow = {
  id: string;
  order_id: string;
  customer_id: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  orders: { order_number: string } | null;
  complaint_status_history: Array<{
    id: string;
    from_status: ComplaintStatus | null;
    to_status: ComplaintStatus;
    note: string | null;
    changed_by: string | null;
    created_at: string;
  }>;
};

export type CustomerComplaintDetailResult =
  | { status: "found"; complaint: CustomerComplaintDetail }
  | { status: "not_found" };

export class GetCustomerComplaintDetailError extends Error {
  constructor() {
    super("Detail komplain customer belum dapat dimuat.");
    this.name = "GetCustomerComplaintDetailError";
  }
}

export async function getCustomerComplaintDetail(
  complaintId: string,
): Promise<CustomerComplaintDetailResult> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetCustomerComplaintDetailError();

  const { data, error } = await supabase
    .from("complaints")
    .select(`
      id, order_id, customer_id, category, subject, description, status,
      resolution_notes, resolved_at, closed_at, created_at, updated_at,
      orders (order_number),
      complaint_status_history (
        id, from_status, to_status, note, changed_by, created_at
      )
    `)
    .eq("id", complaintId)
    .eq("customer_id", user.id)
    .order("created_at", { referencedTable: "complaint_status_history", ascending: true })
    .maybeSingle()
    .overrideTypes<CustomerComplaintDetailRow | null, { merge: false }>();

  if (error) throw new GetCustomerComplaintDetailError();
  if (!data) return { status: "not_found" };

  return {
    status: "found",
    complaint: {
      id: data.id,
      orderId: data.order_id,
      orderNumber: data.orders?.order_number ?? "Pesanan",
      customerId: data.customer_id,
      category: data.category,
      subject: data.subject,
      description: data.description,
      status: data.status,
      resolutionNotes: data.resolution_notes,
      resolvedAt: data.resolved_at,
      closedAt: data.closed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      statusHistory: data.complaint_status_history.map((event) => ({
        id: event.id,
        fromStatus: event.from_status,
        toStatus: event.to_status,
        note: event.note,
        changedBy: event.changed_by,
        createdAt: event.created_at,
      })),
    },
  };
}
