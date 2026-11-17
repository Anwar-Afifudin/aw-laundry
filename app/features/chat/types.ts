export type ChatConversation = {
  id: string;
  customerId: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type CustomerChat = {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  currentUserId: string;
};

export type AdminChatConversation = ChatConversation & {
  customerName: string;
  customerPhone: string | null;
};

export type AdminChatConversationListItem = AdminChatConversation;

export type AdminChatDetail = {
  conversation: AdminChatConversation;
  messages: ChatMessage[];
  currentUserId: string;
};

export type SendChatMessageInput = {
  conversationId?: string | null;
  body: string;
};

export type SendChatMessageResult = {
  conversationId: string;
  messageId: string;
};
