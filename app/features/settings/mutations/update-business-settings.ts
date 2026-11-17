import { supabase } from "~/lib/supabase/client";

import type { BusinessSettings, BusinessSettingsInput } from "../types";

export class UpdateBusinessSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpdateBusinessSettingsError";
  }
}

function mapRpcError(message: string): UpdateBusinessSettingsError {
  if (message.includes("ADMIN_REQUIRED")) {
    return new UpdateBusinessSettingsError(
      "Anda tidak memiliki akses untuk mengubah pengaturan.",
    );
  }
  if (message.includes("INVALID_BUSINESS_SETTINGS")) {
    return new UpdateBusinessSettingsError(
      "Data pengaturan tidak valid. Periksa kembali isian Anda.",
    );
  }
  return new UpdateBusinessSettingsError(
    "Pengaturan belum dapat disimpan. Periksa koneksi lalu coba lagi.",
  );
}

export async function updateBusinessSettings(
  input: BusinessSettingsInput,
): Promise<BusinessSettings> {
  const { data, error } = await supabase
    .rpc("update_business_settings", {
      p_business_name: input.businessName,
      p_phone: input.phone,
      p_email: input.email,
      p_address: input.address,
      p_opening_time: input.openingTime,
      p_closing_time: input.closingTime,
      p_pickup_enabled: input.pickupEnabled,
      p_delivery_enabled: input.deliveryEnabled,
      p_pickup_fee: input.pickupFee,
      p_delivery_fee: input.deliveryFee,
      p_minimum_order: input.minimumOrder,
    })
    .single()
    .overrideTypes<BusinessSettings, { merge: false }>();

  if (error) throw mapRpcError(error.message);
  if (!data) {
    throw new UpdateBusinessSettingsError(
      "Pengaturan belum dapat disimpan. Periksa koneksi lalu coba lagi.",
    );
  }

  return {
    ...data,
    pickup_fee: Number(data.pickup_fee),
    delivery_fee: Number(data.delivery_fee),
    minimum_order: Number(data.minimum_order),
  };
}
