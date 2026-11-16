import { supabase } from "~/lib/supabase/client";

import type { AdminComplaint, ComplaintCategory, ComplaintStatus } from "../types";

type AdminComplaintRow = {
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
};

export class GetAdminComplaintsError extends Error {
  constructor() {
    super("Daftar komplain belum dapat dimuat.");
    this.name = "GetAdminComplaintsError";
  }
}

export async function getAdminComplaints(): Promise<AdminComplaint[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new GetAdminComplaintsError();

  const { data, error } = await supabase
    .from("complaints")
    .select(`
      id, order_id, customer_id, category, subject, description, status,
      resolution_notes, resolved_at, closed_at, created_at, updated_at,
      orders (order_number), profiles (full_name, phone)
    `)
    .order("created_at", { ascending: false })
    .overrideTypes<AdminComplaintRow[], { merge: false }>();

  if (error || !data) throw new GetAdminComplaintsError();

  return data.map((complaint) => ({
    id: complaint.id,
    orderId: complaint.order_id,
    orderNumber: complaint.orders?.order_number ?? "Pesanan",
    customerId: complaint.customer_id,
    customerName: complaint.profiles?.full_name ?? "Pelanggan",
    customerPhone: complaint.profiles?.phone ?? null,
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
