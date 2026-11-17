import { supabase } from "~/lib/supabase/client";

import type { ChatSubscriptionStatus } from "./subscribe-to-chat-messages";

type SubscribeToChatConversationsOptions = {
  onChange: () => void;
  onStatusChange?: (status: ChatSubscriptionStatus, error?: Error) => void;
};

export function subscribeToChatConversations({
  onChange,
  onStatusChange,
}: SubscribeToChatConversationsOptions): () => void {
  const channelName = `admin-chat-conversations-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_conversations" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "chat_conversations" },
      onChange,
    )
    .subscribe((status, error) => onStatusChange?.(status, error));

  return () => {
    void supabase.removeChannel(channel);
  };
}
