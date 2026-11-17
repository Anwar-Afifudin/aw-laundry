import { supabase } from "~/lib/supabase/client";

import type { SendChatMessageInput, SendChatMessageResult } from "../types";

type SendChatMessageRow = {
  conversation_id: string;
  message_id: string;
};

export type SendChatMessageErrorKind =
  | "authentication"
  | "authorization"
  | "validation"
  | "conversation"
  | "server";

export class SendChatMessageError extends Error {
  readonly kind: SendChatMessageErrorKind;

  constructor(kind: SendChatMessageErrorKind, message: string) {
    super(message);
    this.name = "SendChatMessageError";
    this.kind = kind;
  }
}

function mapRpcError(error: { message: string }): SendChatMessageError {
  if (error.message.includes("AUTH_REQUIRED")) {
    return new SendChatMessageError(
      "authentication",
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali.",
    );
  }
  if (error.message.includes("PROFILE_INVALID")) {
    return new SendChatMessageError(
      "authorization",
      "Profil Anda tidak aktif atau tidak memiliki akses ke chat.",
    );
  }
  if (error.message.includes("CHAT_MESSAGE_REQUIRED")) {
    return new SendChatMessageError("validation", "Pesan tidak boleh kosong.");
  }
  if (error.message.includes("CHAT_MESSAGE_TOO_LONG")) {
    return new SendChatMessageError(
      "validation",
      "Pesan tidak boleh lebih dari 2.000 karakter.",
    );
  }
  if (error.message.includes("CHAT_CONVERSATION_REQUIRED")) {
    return new SendChatMessageError(
      "conversation",
      "Percakapan harus dipilih sebelum mengirim pesan.",
    );
  }
  if (error.message.includes("CHAT_CONVERSATION_NOT_FOUND")) {
    return new SendChatMessageError(
      "conversation",
      "Percakapan tidak ditemukan atau sudah tidak tersedia.",
    );
  }
  if (error.message.includes("CHAT_FORBIDDEN")) {
    return new SendChatMessageError(
      "authorization",
      "Anda tidak memiliki akses untuk mengirim pesan ke percakapan ini.",
    );
  }

  return new SendChatMessageError(
    "server",
    "Pesan belum berhasil dikirim. Periksa koneksi lalu coba lagi.",
  );
}

export async function sendChatMessage(
  input: SendChatMessageInput,
): Promise<SendChatMessageResult> {
  const body = input.body.trim();

  if (!body) {
    throw new SendChatMessageError("validation", "Pesan tidak boleh kosong.");
  }
  if (body.length > 2000) {
    throw new SendChatMessageError(
      "validation",
      "Pesan tidak boleh lebih dari 2.000 karakter.",
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new SendChatMessageError(
      "authentication",
      "Sesi Anda sudah tidak aktif. Silakan masuk kembali.",
    );
  }

  const { data, error } = await supabase.rpc("send_chat_message", {
    p_conversation_id: input.conversationId ?? null,
    p_body: body,
  });

  if (error) throw mapRpcError(error);

  const rows = data as unknown as SendChatMessageRow[] | null;
  const result = rows?.[0];
  if (!result?.conversation_id || !result.message_id) {
    throw new SendChatMessageError(
      "server",
      "Pengiriman pesan belum dapat dikonfirmasi. Silakan coba lagi.",
    );
  }

  return {
    conversationId: result.conversation_id,
    messageId: result.message_id,
  };
}
