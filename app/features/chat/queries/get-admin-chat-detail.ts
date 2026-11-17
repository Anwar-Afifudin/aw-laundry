import { supabase } from "~/lib/supabase/client";

import type { AdminChatDetail, ChatMessage } from "../types";

type AdminChatConversationRow = {
  id: string;
  customer_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string; phone: string | null } | null;
};

type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export class GetAdminChatDetailError extends Error {
  constructor(message = "Percakapan belum dapat dimuat. Periksa koneksi lalu coba lagi.") {
    super(message);
    this.name = "GetAdminChatDetailError";
  }
}

function mapMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function getAdminChatDetail(conversationId: string): Promise<AdminChatDetail> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new GetAdminChatDetailError(
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali.",
    );
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select(`
      id, customer_id, last_message_at, created_at, updated_at,
      profiles (full_name, phone)
    `)
    .eq("id", conversationId)
    .maybeSingle()
    .overrideTypes<AdminChatConversationRow | null, { merge: false }>();

  if (conversationError) throw new GetAdminChatDetailError();
  if (!conversation) {
    throw new GetAdminChatDetailError("Percakapan tidak ditemukan atau tidak dapat diakses.");
  }

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<ChatMessageRow[], { merge: false }>();

  if (messagesError || !messages) {
    throw new GetAdminChatDetailError("Riwayat pesan belum dapat dimuat. Silakan coba lagi.");
  }

  return {
    conversation: {
      id: conversation.id,
      customerId: conversation.customer_id,
      customerName: conversation.profiles?.full_name ?? "Pelanggan",
      customerPhone: conversation.profiles?.phone ?? null,
      lastMessageAt: conversation.last_message_at,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    },
    messages: messages.map(mapMessage),
    currentUserId: user.id,
  };
}
