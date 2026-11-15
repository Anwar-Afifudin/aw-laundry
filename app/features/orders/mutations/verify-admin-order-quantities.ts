import { supabase } from "~/lib/supabase/client";

export type VerifiedOrderItemInput = {
  itemId: string;
  actualQuantity: number;
  actualItemCount?: number | null;
};

export class VerifyAdminOrderQuantitiesError extends Error {
  constructor(message = "Berat atau jumlah aktual belum dapat disimpan.") {
    super(message);
    this.name = "VerifyAdminOrderQuantitiesError";
  }
}

export async function verifyAdminOrderQuantities(
  orderId: string,
  items: VerifiedOrderItemInput[],
) {
  const { error } = await supabase.rpc("verify_admin_order_quantities_v2", {
    p_order_id: orderId,
    p_item_ids: items.map((item) => item.itemId),
    p_actual_quantities: items.map((item) => item.actualQuantity),
    p_actual_item_counts: items.map((item) => item.actualItemCount ?? null),
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error("verify_admin_order_quantities_v2 gagal", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }

    const safeMessages: Record<string, string> = {
      ADMIN_REQUIRED: "Akun Anda tidak memiliki akses untuk memverifikasi pesanan.",
      ORDER_NOT_FOUND: "Pesanan tidak ditemukan.",
      ORDER_NOT_WEIGHING: "Berat hanya dapat diverifikasi saat pesanan sedang ditimbang.",
      INVALID_ACTUAL_QUANTITIES: "Berat atau jumlah aktual tidak valid.",
      INVALID_VERIFICATION_INPUT: "Data verifikasi belum lengkap atau tidak sesuai.",
      ACTUAL_QUANTITY_REQUIRED: "Berat atau jumlah aktual wajib lebih dari 0.",
      INVALID_ACTUAL_ITEM_COUNT: "Jumlah pakaian harus berupa bilangan bulat lebih dari 0.",
      KG_ITEM_COUNT_REQUIRED: "Jumlah pakaian wajib diisi untuk layanan kilogram.",
      WHOLE_QUANTITY_REQUIRED: "Jumlah pasang atau pcs harus berupa bilangan bulat.",
      INVALID_ORDER_ITEMS: "Item pesanan tidak cocok dengan data yang tersimpan.",
      DUPLICATE_ORDER_ITEMS: "Terdapat item pesanan yang dikirim lebih dari satu kali.",
    };
    throw new VerifyAdminOrderQuantitiesError(
      safeMessages[error.message] ?? "Berat atau jumlah aktual belum dapat disimpan.",
    );
  }
}
