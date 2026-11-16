import { supabase } from "~/lib/supabase/client";

import type { CreateCustomerComplaintInput } from "../types";

export type CreateCustomerComplaintErrorKind =
  | "authentication"
  | "authorization"
  | "validation"
  | "order"
  | "server";

export class CreateCustomerComplaintError extends Error {
  readonly kind: CreateCustomerComplaintErrorKind;

  constructor(kind: CreateCustomerComplaintErrorKind, message: string) {
    super(message);
    this.name = "CreateCustomerComplaintError";
    this.kind = kind;
  }
}

function mapRpcError(error: { code?: string; message: string }) {
  if (error.message.includes("AUTH_REQUIRED") || error.code === "28000") {
    return new CreateCustomerComplaintError(
      "authentication",
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali.",
    );
  }
  if (error.message.includes("CUSTOMER_PROFILE_INVALID") || error.code === "42501") {
    return new CreateCustomerComplaintError(
      "authorization",
      "Akun customer Anda tidak aktif atau tidak memiliki akses membuat komplain.",
    );
  }
  if (error.message.includes("ORDER_NOT_FOUND") || error.code === "P0002") {
    return new CreateCustomerComplaintError(
      "order",
      "Pesanan tidak ditemukan atau tidak dapat diakses oleh akun Anda.",
    );
  }
  if (error.message.includes("INVALID_COMPLAINT")) {
    return new CreateCustomerComplaintError(
      "validation",
      "Data komplain belum valid. Periksa kembali pesanan, kategori, judul, dan deskripsi.",
    );
  }
  return new CreateCustomerComplaintError(
    "server",
    "Komplain belum berhasil dikirim. Periksa koneksi lalu coba lagi.",
  );
}

export async function createCustomerComplaint(
  input: CreateCustomerComplaintInput,
): Promise<string> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new CreateCustomerComplaintError(
      "authentication",
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali.",
    );
  }

  const { data, error } = await supabase.rpc("create_customer_complaint", {
    p_order_id: input.orderId,
    p_category: input.category,
    p_subject: input.subject,
    p_description: input.description,
  });

  if (error) throw mapRpcError(error);
  if (typeof data !== "string") {
    throw new CreateCustomerComplaintError(
      "server",
      "Komplain belum berhasil dikonfirmasi. Silakan coba lagi.",
    );
  }

  return data;
}
