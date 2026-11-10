export type CustomerAddress = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string | null;
  district: string | null;
  postal_code: string | null;
  notes: string | null;
  is_default: boolean;
};

export type CreateCustomerAddressInput = {
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string | null;
  district: string | null;
  postal_code: string | null;
  notes: string | null;
  is_default: boolean;
};

export type CustomerAddressesState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; addresses: CustomerAddress[] }
  | { status: "error" };
