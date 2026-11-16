import { supabase } from "~/lib/supabase/client";

import type { ComplaintStatus } from "../types";

export class UpdateAdminComplaintStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpdateAdminComplaintStatusError";
  }
}

function mapRpcError(error: { code?: string; message: string }) {
  if (error.message.includes("ADMIN_REQUIRED") || error.code === "42501") {
    return new UpdateAdminComplaintStatusError(
      "Akun Anda tidak memiliki akses admin aktif untuk memperbarui komplain.",
    );
  }
  if (error.message.includes("COMPLAINT_NOT_FOUND") || error.code === "P0002") {
    return new UpdateAdminComplaintStatusError(
      "Komplain tidak ditemukan atau sudah tidak tersedia.",
    );
  }
  if (error.message.includes("INVALID_COMPLAINT_STATUS_TRANSITION")) {
    return new UpdateAdminComplaintStatusError(
      "Status komplain telah berubah atau transisi yang diminta tidak valid. Muat ulang detail komplain.",
    );
  }
  if (error.message.includes("COMPLAINT_RESOLUTION_NOTES_REQUIRED")) {
    return new UpdateAdminComplaintStatusError(
      "Catatan penyelesaian wajib diisi sebelum komplain ditandai selesai.",
    );
  }
  if (error.message.includes("COMPLAINT_NOTE_TOO_LONG")) {
    return new UpdateAdminComplaintStatusError(
      "Catatan komplain tidak boleh lebih dari 3000 karakter.",
    );
  }
  return new UpdateAdminComplaintStatusError(
    "Status komplain belum dapat diperbarui. Periksa koneksi lalu coba lagi.",
  );
}

export async function updateAdminComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  note: string | null,
) {
  const { error } = await supabase.rpc("update_admin_complaint_status", {
    p_complaint_id: complaintId,
    p_to_status: status,
    p_note: note,
  });
  if (error) throw mapRpcError(error);
}
