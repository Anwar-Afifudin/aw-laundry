import { supabase } from "~/lib/supabase/client";

import type {
  AdminComplaintDetail,
  ComplaintCategory,
  ComplaintStatus,
} from "../types";

type AdminComplaintDetailRow = {
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
  profiles: { full_name: string; phone: string | null } | null;
  complaint_status_history: Array<{
    id: string;
    from_status: ComplaintStatus | null;
    to_status: ComplaintStatus;
    note: string | null;
    changed_by: string | null;
    created_at: string;
  }>;
};

export type AdminComplaintDetailResult =
  | { status: "found"; complaint: AdminComplaintDetail }
  | { status: "not_found" };

export class GetAdminComplaintDetailError extends Error {
  constructor() {
    super("Detail komplain belum dapat dimuat.");
    this.name = "GetAdminComplaintDetailError";
  }
}

export async function getAdminComplaintDetail(
  complaintId: string,
): Promise<AdminComplaintDetailResult> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetAdminComplaintDetailError();

  const { data, error } = await supabase
    .from("complaints")
    .select(`
      id, order_id, customer_id, category, subject, description, status,
      resolution_notes, resolved_at, closed_at, created_at, updated_at,
      orders (order_number), profiles (full_name, phone),
      complaint_status_history (
        id, from_status, to_status, note, changed_by, created_at
      )
    `)
    .eq("id", complaintId)
    .order("created_at", { referencedTable: "complaint_status_history", ascending: true })
    .maybeSingle()
    .overrideTypes<AdminComplaintDetailRow | null, { merge: false }>();

  if (error) throw new GetAdminComplaintDetailError();
  if (!data) return { status: "not_found" };

  return {
    status: "found",
    complaint: {
      id: data.id,
      orderId: data.order_id,
      orderNumber: data.orders?.order_number ?? "Pesanan",
      customerId: data.customer_id,
      customerName: data.profiles?.full_name ?? "Pelanggan",
      customerPhone: data.profiles?.phone ?? null,
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
