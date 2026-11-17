import { supabase } from "~/lib/supabase/client";

import type { ChatConversation, ChatMessage, CustomerChat } from "../types";

type ChatConversationRow = {
  id: string;
  customer_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type GetCustomerChatErrorKind = "authentication" | "server";

export class GetCustomerChatError extends Error {
  readonly kind: GetCustomerChatErrorKind;

  constructor(kind: GetCustomerChatErrorKind, message: string) {
    super(message);
    this.name = "GetCustomerChatError";
    this.kind = kind;
  }
}

function mapConversation(row: ChatConversationRow): ChatConversation {
  return {
    id: row.id,
    customerId: row.customer_id,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

export async function getCustomerChat(): Promise<CustomerChat> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new GetCustomerChatError(
      "authentication",
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali.",
    );
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select("id, customer_id, last_message_at, created_at, updated_at")
    .eq("customer_id", user.id)
    .maybeSingle()
    .overrideTypes<ChatConversationRow | null, { merge: false }>();

  if (conversationError) {
    throw new GetCustomerChatError(
      "server",
      "Percakapan belum dapat dimuat. Periksa koneksi lalu coba lagi.",
    );
  }

  if (!conversation) {
    return { conversation: null, messages: [], currentUserId: user.id };
  }

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<ChatMessageRow[], { merge: false }>();

  if (messagesError || !messages) {
    throw new GetCustomerChatError(
      "server",
      "Pesan belum dapat dimuat. Periksa koneksi lalu coba lagi.",
    );
  }

  return {
    conversation: mapConversation(conversation),
    messages: messages.map(mapMessage),
    currentUserId: user.id,
  };
}
