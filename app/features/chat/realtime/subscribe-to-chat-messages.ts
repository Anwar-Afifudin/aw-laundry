import { supabase } from "~/lib/supabase/client";

import type { ChatMessage } from "../types";

type RealtimeChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ChatSubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

type SubscribeToChatMessagesOptions = {
  conversationId: string;
  onInsert: (message: ChatMessage) => void;
  onStatusChange?: (status: ChatSubscriptionStatus, error?: Error) => void;
};

function mapMessage(row: RealtimeChatMessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function subscribeToChatMessages({
  conversationId,
  onInsert,
  onStatusChange,
}: SubscribeToChatMessagesOptions): () => void {
  const channel = supabase
    .channel(`customer-chat-messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(mapMessage(payload.new as RealtimeChatMessageRow)),
    )
    .subscribe((status, error) => onStatusChange?.(status, error));

  return () => {
    void supabase.removeChannel(channel);
  };
}
