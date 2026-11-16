import { supabase } from "~/lib/supabase/client";

import type { ComplaintCategory, ComplaintStatus, CustomerComplaint } from "../types";

type CustomerComplaintRow = {
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
};

export class GetCustomerComplaintsError extends Error {
  constructor() {
    super("Komplain customer belum dapat dimuat.");
    this.name = "GetCustomerComplaintsError";
  }
}

export async function getCustomerComplaints(): Promise<CustomerComplaint[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetCustomerComplaintsError();

  const { data, error } = await supabase
    .from("complaints")
    .select(`
      id, order_id, customer_id, category, subject, description, status,
      resolution_notes, resolved_at, closed_at, created_at, updated_at,
      orders (order_number)
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .overrideTypes<CustomerComplaintRow[], { merge: false }>();

  if (error || !data) throw new GetCustomerComplaintsError();

  return data.map((complaint) => ({
    id: complaint.id,
    orderId: complaint.order_id,
    orderNumber: complaint.orders?.order_number ?? "Pesanan",
    customerId: complaint.customer_id,
    category: complaint.category,
    subject: complaint.subject,
    description: complaint.description,
    status: complaint.status,
    resolutionNotes: complaint.resolution_notes,
    resolvedAt: complaint.resolved_at,
    closedAt: complaint.closed_at,
    createdAt: complaint.created_at,
    updatedAt: complaint.updated_at,
  }));
}
