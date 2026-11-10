import { supabase } from "~/lib/supabase/client";

import type {
  CreateCustomerAddressInput,
  CustomerAddress,
} from "../types";

type CustomerAddressRow = CustomerAddress & {
  customer_id: string;
};

function normalizeOptionalText(value: string | null) {
  const normalizedValue = value?.trim() ?? "";

  return normalizedValue ? normalizedValue : null;
}

export async function createCurrentCustomerAddress(
  input: CreateCustomerAddressInput,
): Promise<CustomerAddress> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Authenticated customer is required to create an address.");
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      customer_id: user.id,
      label: input.label.trim(),
      recipient_name: input.recipient_name.trim(),
      phone: input.phone.trim(),
      address_line: input.address_line.trim(),
      city: normalizeOptionalText(input.city),
      district: normalizeOptionalText(input.district),
      postal_code: normalizeOptionalText(input.postal_code),
      notes: normalizeOptionalText(input.notes),
      is_default: input.is_default,
    })
    .select(
      "id, customer_id, label, recipient_name, phone, address_line, city, district, postal_code, notes, is_default",
    )
    .single()
    .overrideTypes<CustomerAddressRow, { merge: false }>();

  if (error) {
    throw error;
  }

  if (data.customer_id !== user.id) {
    throw new Error("Address ownership verification failed.");
  }

  return {
    id: data.id,
    label: data.label,
    recipient_name: data.recipient_name,
    phone: data.phone,
    address_line: data.address_line,
    city: data.city,
    district: data.district,
    postal_code: data.postal_code,
    notes: data.notes,
    is_default: data.is_default,
  };
}
