import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { CircleAlertIcon, MessageCircleIcon, RefreshCwIcon, SendIcon } from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { SendChatMessageError, sendChatMessage } from "~/features/chat/mutations/send-chat-message";
import { getCustomerChat } from "~/features/chat/queries/get-customer-chat";
import { subscribeToChatMessages } from "~/features/chat/realtime/subscribe-to-chat-messages";
import type { CustomerChat } from "~/features/chat/types";
import { cn } from "~/lib/utils";

type ChatPageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; chat: CustomerChat };

const messageTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function meta() {
  return [{ title: "Chat | A&W Laundry" }];
}

function ChatSkeleton() {
  return (
    <Card aria-label="Memuat percakapan" className="min-h-[32rem]">
      <CardHeader className="border-b">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-4">
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
        <Skeleton className="ml-auto h-20 w-4/5 rounded-2xl" />
        <Skeleton className="h-14 w-2/3 rounded-2xl" />
        <Skeleton className="mt-4 h-24 w-full" />
      </CardContent>
    </Card>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="text-center">
      <CardContent className="flex flex-col items-center py-12">
        <CircleAlertIcon className="size-11 text-rose-500" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Chat belum dapat dimuat</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">{message}</p>
        <Button type="button" className="mt-5" onClick={onRetry}>
          <RefreshCwIcon aria-hidden="true" />
          Coba lagi
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CustomerChatPage() {
  const [state, setState] = useState<ChatPageState>({ status: "loading" });
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSubmittingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChat = useCallback(async (showLoading = true) => {
    if (showLoading) setState({ status: "loading" });

    try {
      const chat = await getCustomerChat();
      setState({ status: "ready", chat });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error
          ? error.message
          : "Terjadi gangguan saat memuat percakapan. Silakan coba lagi.",
      });
    }
  }, []);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  const conversationId = state.status === "ready" ? state.chat.conversation?.id : undefined;
  const messageCount = state.status === "ready" ? state.chat.messages.length : 0;

  useEffect(() => {
    if (!conversationId) return;

    return subscribeToChatMessages({
      conversationId,
      onInsert: (message) => {
        setState((current) => {
          if (current.status !== "ready" || current.chat.conversation?.id !== conversationId) {
            return current;
          }
          if (current.chat.messages.some((item) => item.id === message.id)) return current;

          return {
            status: "ready",
            chat: {
              ...current.chat,
              messages: [...current.chat.messages, message],
            },
          };
        });
      },
      onStatusChange: (status, error) => {
        console.log("[chat realtime]", status, error);
      },
    });
  }, [conversationId]);

  useEffect(() => {
    if (state.status !== "ready") return;
    messagesEndRef.current?.scrollIntoView({ behavior: messageCount ? "smooth" : "auto" });
  }, [messageCount, state.status]);

  const submitMessage = async () => {
    if (state.status !== "ready" || isSubmittingRef.current || !body.trim()) return;

    isSubmittingRef.current = true;
    setIsSending(true);
    setSendError(null);

    try {
      const result = await sendChatMessage({
        conversationId: state.chat.conversation?.id,
        body,
      });
      const chat = await getCustomerChat();

      if (chat.conversation?.id !== result.conversationId) {
        throw new Error("Percakapan belum dapat dimuat ulang. Silakan coba lagi.");
      }

      setBody("");
      setState({ status: "ready", chat });
    } catch (error) {
      setSendError(
        error instanceof SendChatMessageError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Pesan belum berhasil dikirim. Silakan coba lagi.",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bantuan pelanggan"
        title="Chat A&W Laundry"
        description="Berkomunikasi langsung dengan tim A&W Laundry untuk mendapatkan bantuan terkait layanan Anda."
      />

      {state.status === "loading" ? (
        <ChatSkeleton />
      ) : state.status === "error" ? (
        <LoadError message={state.message} onRetry={() => void loadChat()} />
      ) : (
        <Card className="h-[min(70vh,42rem)] min-h-[32rem] border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <MessageCircleIcon className="size-5" aria-hidden="true" />
              </span>
              Tim A&W Laundry
            </CardTitle>
            <p className="text-sm text-slate-500">Balasan dari tim kami akan tampil langsung di sini.</p>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0">
            <div
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 sm:px-6"
              aria-live="polite"
              aria-label="Riwayat pesan"
            >
              {state.chat.messages.length === 0 ? (
                <div className="m-auto flex max-w-sm flex-col items-center px-4 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <MessageCircleIcon className="size-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-semibold text-slate-950">Mulai percakapan</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Kirim pesan pertama Anda untuk memulai percakapan dengan tim A&W Laundry.
                  </p>
                </div>
              ) : (
                state.chat.messages.map((message) => {
                  const isCustomer = message.senderId === state.chat.currentUserId;

                  return (
                    <div key={message.id} className={cn("flex", isCustomer ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%]",
                          isCustomer
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-slate-100 text-slate-900",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
                          {message.body}
                        </p>
                        <time
                          dateTime={message.createdAt}
                          className={cn(
                            "mt-1 block text-right text-[0.6875rem]",
                            isCustomer ? "text-blue-100" : "text-slate-500",
                          )}
                        >
                          {messageTimeFormatter.format(new Date(message.createdAt))} WIB
                        </time>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="border-t border-slate-200 bg-white p-3 sm:p-4" onSubmit={handleSubmit}>
              {sendError ? (
                <Alert variant="destructive" className="mb-3">
                  <CircleAlertIcon aria-hidden="true" />
                  <AlertDescription>{sendError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Textarea
                    value={body}
                    onChange={(event) => {
                      setBody(event.target.value);
                      if (sendError) setSendError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    maxLength={2000}
                    rows={2}
                    placeholder="Tulis pesan Anda..."
                    aria-label="Pesan"
                    className="max-h-36 min-h-20 resize-none"
                    disabled={isSending}
                  />
                  <div className="mt-1 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
                    <span>Enter untuk kirim · Shift+Enter untuk baris baru</span>
                    <span className="shrink-0 tabular-nums">{body.length}/2000</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="mb-6 shrink-0"
                  disabled={isSending || !body.trim()}
                >
                  <SendIcon aria-hidden="true" />
                  <span className="hidden sm:inline">{isSending ? "Mengirim..." : "Kirim"}</span>
                  <span className="sr-only sm:hidden">{isSending ? "Mengirim pesan" : "Kirim"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
