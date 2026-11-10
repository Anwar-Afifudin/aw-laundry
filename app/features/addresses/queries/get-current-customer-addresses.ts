import { supabase } from "~/lib/supabase/client";

import type { CustomerAddress } from "../types";

type CustomerAddressRow = CustomerAddress & {
  customer_id: string;
};

export async function getCurrentCustomerAddresses(): Promise<
  CustomerAddress[]
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Authenticated customer is required to load addresses.");
  }

  const { data, error } = await supabase
    .from("addresses")
    .select(
      "id, customer_id, label, recipient_name, phone, address_line, city, district, postal_code, notes, is_default",
    )
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("label", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<CustomerAddressRow[], { merge: false }>();

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  if (rows.some((address) => address.customer_id !== user.id)) {
    throw new Error("Address ownership verification failed.");
  }

  return rows.map((address) => ({
    id: address.id,
    label: address.label,
    recipient_name: address.recipient_name,
    phone: address.phone,
    address_line: address.address_line,
    city: address.city,
    district: address.district,
    postal_code: address.postal_code,
    notes: address.notes,
    is_default: address.is_default,
  }));
}
