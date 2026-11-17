import { supabase } from "~/lib/supabase/client";

import type { AdminChatConversationListItem } from "../types";

type AdminChatConversationRow = {
  id: string;
  customer_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string; phone: string | null } | null;
};

export class GetAdminChatConversationsError extends Error {
  constructor(message = "Daftar percakapan belum dapat dimuat. Periksa koneksi lalu coba lagi.") {
    super(message);
    this.name = "GetAdminChatConversationsError";
  }
}

export async function getAdminChatConversations(): Promise<AdminChatConversationListItem[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new GetAdminChatConversationsError(
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali.",
    );
  }

  const { data, error } = await supabase
    .from("chat_conversations")
    .select(`
      id, customer_id, last_message_at, created_at, updated_at,
      profiles (full_name, phone)
    `)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .overrideTypes<AdminChatConversationRow[], { merge: false }>();

  if (error || !data) throw new GetAdminChatConversationsError();

  return data.map((conversation) => ({
    id: conversation.id,
    customerId: conversation.customer_id,
    customerName: conversation.profiles?.full_name ?? "Pelanggan",
    customerPhone: conversation.profiles?.phone ?? null,
    lastMessageAt: conversation.last_message_at,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  }));
}
