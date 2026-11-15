import { supabase } from "~/lib/supabase/client";

import type {
  CreateCustomerOrderErrorKind,
  CreateCustomerOrderInput,
  CreatedCustomerOrder,
  OrderIntakeMethod,
  OrderReturnMethod,
} from "../types";

type CustomerProfileAccessRow = {
  id: string;
  role: string;
  is_active: boolean;
};

type CreateCustomerOrderRpcRow = {
  id: string;
  order_number: string;
  status: "ORDER_CREATED";
  service_name: string;
  estimated_total: number;
  estimated_completion_at: string;
  intake_method: OrderIntakeMethod;
  return_method: OrderReturnMethod;
  created_at: string;
};

export class CreateCustomerOrderError extends Error {
  readonly kind: CreateCustomerOrderErrorKind;

  constructor(kind: CreateCustomerOrderErrorKind, message: string) {
    super(message);
    this.name = "CreateCustomerOrderError";
    this.kind = kind;
  }
}

function mapRpcError(error: { code?: string; message: string }) {
  const errorMessage = error.message;

  if (errorMessage.includes("AUTH_REQUIRED") || error.code === "28000") {
    return new CreateCustomerOrderError(
      "authentication",
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali sebelum membuat pesanan.",
    );
  }

  if (errorMessage.includes("CUSTOMER_PROFILE_INVALID")) {
    return new CreateCustomerOrderError(
      "authorization",
      "Akun customer Anda tidak aktif atau tidak memiliki akses untuk membuat pesanan.",
    );
  }

  if (
    errorMessage.includes("PICKUP_ADDRESS_INVALID") ||
    errorMessage.includes("DELIVERY_ADDRESS_INVALID")
  ) {
    return new CreateCustomerOrderError(
      "authorization",
      "Alamat yang dipilih tidak dapat digunakan. Pilih kembali alamat milik akun Anda.",
    );
  }

  if (
    errorMessage.includes("SERVICE_UNAVAILABLE") ||
    errorMessage.includes("SERVICE_TYPE_UNSUPPORTED")
  ) {
    return new CreateCustomerOrderError(
      "service",
      "Layanan yang dipilih sudah tidak tersedia atau belum mendukung pemesanan online.",
    );
  }

  if (
    errorMessage.includes("INVALID_ORDER_INPUT") ||
    errorMessage.includes("INVALID_ORDER_ITEMS") ||
    errorMessage.includes("DUPLICATE_SERVICES") ||
    errorMessage.includes("INVALID_QUANTITY") ||
    errorMessage.includes("INVALID_SPECIAL_INSTRUCTIONS") ||
    errorMessage.includes("PICKUP_ADDRESS_REQUIRED") ||
    errorMessage.includes("DELIVERY_ADDRESS_REQUIRED")
  ) {
    return new CreateCustomerOrderError(
      "validation",
      "Data pesanan belum valid. Periksa kembali layanan, jumlah laundry, dan alamat yang dipilih.",
    );
  }

  if (errorMessage.includes("ORDER_REQUEST_CONFLICT")) {
    return new CreateCustomerOrderError(
      "validation",
      "Permintaan ini sudah diproses dengan data berbeda. Muat ulang halaman sebelum membuat pesanan baru.",
    );
  }

  if (error.code === "42501") {
    return new CreateCustomerOrderError(
      "authorization",
      "Pesanan tidak dapat dibuat karena akses akun atau alamat tidak valid.",
    );
  }

  return new CreateCustomerOrderError(
    "server",
    "Pesanan belum berhasil dibuat. Periksa koneksi lalu coba lagi.",
  );
}

export async function createCurrentCustomerOrder(
  input: CreateCustomerOrderInput,
): Promise<CreatedCustomerOrder> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new CreateCustomerOrderError(
      "authentication",
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali sebelum membuat pesanan.",
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle<CustomerProfileAccessRow>();

  if (profileError) {
    throw new CreateCustomerOrderError(
      profileError.code === "42501" ? "authorization" : "server",
      profileError.code === "42501"
        ? "Akun Anda tidak memiliki akses untuk membuat pesanan."
        : "Profil customer belum dapat diverifikasi. Periksa koneksi lalu coba lagi.",
    );
  }

  if (
    !profile ||
    profile.id !== user.id ||
    profile.role !== "CUSTOMER" ||
    !profile.is_active
  ) {
    throw new CreateCustomerOrderError(
      "authorization",
      "Akun customer Anda tidak aktif atau tidak memiliki akses untuk membuat pesanan.",
    );
  }

  const { data, error } = await supabase
    .rpc("create_customer_order_multi", {
      p_order_id: input.orderId,
      p_items: input.items.map((item) => ({
        service_id: item.serviceId,
        estimated_quantity: item.estimatedQuantity,
      })),
      p_intake_method: input.intakeMethod,
      p_return_method: input.returnMethod,
      p_pickup_address_id: input.pickupAddressId,
      p_delivery_address_id: input.deliveryAddressId,
      p_special_instructions: input.specialInstructions,
    })
    .single()
    .overrideTypes<CreateCustomerOrderRpcRow, { merge: false }>();

  if (error) {
    throw mapRpcError(error);
  }

  if (!data) {
    throw new CreateCustomerOrderError(
      "server",
      "Pesanan belum berhasil dikonfirmasi. Periksa koneksi lalu coba lagi.",
    );
  }

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    serviceName: data.service_name,
    estimatedTotal: data.estimated_total,
    estimatedCompletionAt: data.estimated_completion_at,
    intakeMethod: data.intake_method,
    returnMethod: data.return_method,
    createdAt: data.created_at,
  };
}
