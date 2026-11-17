import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  CircleAlertIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  UserIcon,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { SendChatMessageError, sendChatMessage } from "~/features/chat/mutations/send-chat-message";
import { getAdminChatConversations } from "~/features/chat/queries/get-admin-chat-conversations";
import { getAdminChatDetail } from "~/features/chat/queries/get-admin-chat-detail";
import { subscribeToChatConversations } from "~/features/chat/realtime/subscribe-to-chat-conversations";
import { subscribeToChatMessages } from "~/features/chat/realtime/subscribe-to-chat-messages";
import type { AdminChatConversationListItem, AdminChatDetail } from "~/features/chat/types";
import { cn } from "~/lib/utils";

type ConversationsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; conversations: AdminChatConversationListItem[] };

type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; detail: AdminChatDetail };

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const messageTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function meta() {
  return [{ title: "Chat Admin | A&W Laundry" }];
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-3 p-3" aria-label="Memuat daftar percakapan">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2 rounded-lg border p-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex min-h-[32rem] flex-1 flex-col p-4" aria-label="Memuat percakapan">
      <Skeleton className="h-14 w-full" />
      <div className="flex flex-1 flex-col justify-end gap-4 py-6">
        <Skeleton className="h-16 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-20 w-3/4 rounded-2xl" />
        <Skeleton className="h-14 w-1/2 rounded-2xl" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function AdminChatPage() {
  const [conversationsState, setConversationsState] = useState<ConversationsState>({
    status: "loading",
  });
  const [detailState, setDetailState] = useState<DetailState>({ status: "idle" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSubmittingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (showLoading) setConversationsState({ status: "loading" });

    try {
      const conversations = await getAdminChatConversations();
      setConversationsState({ status: "ready", conversations });
      setSelectedId((current) => {
        if (current && conversations.some((conversation) => conversation.id === current)) {
          return current;
        }
        return conversations[0]?.id ?? null;
      });
    } catch (error) {
      if (showLoading) {
        setConversationsState({
          status: "error",
          message: error instanceof Error
            ? error.message
            : "Daftar percakapan belum dapat dimuat. Silakan coba lagi.",
        });
      }
    }
  }, []);

  const loadDetail = useCallback(async (conversationId: string) => {
    setDetailState({ status: "loading" });
    try {
      const detail = await getAdminChatDetail(conversationId);
      setDetailState({ status: "ready", detail });
    } catch (error) {
      setDetailState({
        status: "error",
        message: error instanceof Error
          ? error.message
          : "Percakapan belum dapat dimuat. Silakan coba lagi.",
      });
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => subscribeToChatConversations({
    onChange: () => void loadConversations(false),
  }), [loadConversations]);

  useEffect(() => {
    setBody("");
    setSendError(null);
    if (!selectedId) {
      setDetailState({ status: "idle" });
      return;
    }
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    return subscribeToChatMessages({
      conversationId: selectedId,
      onInsert: (message) => {
        setDetailState((current) => {
          if (current.status !== "ready" || current.detail.conversation.id !== selectedId) {
            return current;
          }
          if (current.detail.messages.some((item) => item.id === message.id)) return current;

          return {
            status: "ready",
            detail: {
              ...current.detail,
              messages: [...current.detail.messages, message],
            },
          };
        });
      },
    });
  }, [selectedId]);

  const messageCount = detailState.status === "ready" ? detailState.detail.messages.length : 0;
  useEffect(() => {
    if (detailState.status !== "ready") return;
    messagesEndRef.current?.scrollIntoView({ behavior: messageCount ? "smooth" : "auto" });
  }, [detailState.status, messageCount]);

  const visibleConversations = useMemo(() => {
    if (conversationsState.status !== "ready") return [];
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return conversationsState.conversations;

    return conversationsState.conversations.filter((conversation) =>
      conversation.customerName.toLocaleLowerCase("id-ID").includes(query)
      || conversation.customerPhone?.toLocaleLowerCase("id-ID").includes(query),
    );
  }, [conversationsState, search]);

  const submitMessage = async () => {
    if (!selectedId || detailState.status !== "ready" || isSubmittingRef.current || !body.trim()) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSending(true);
    setSendError(null);

    try {
      await sendChatMessage({ conversationId: selectedId, body });
      const detail = await getAdminChatDetail(selectedId);
      setBody("");
      setDetailState({ status: "ready", detail });
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
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Layanan pelanggan"
        title="Chat"
        description="Kelola percakapan langsung dengan pelanggan A&W Laundry."
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 border-slate-200 shadow-sm lg:col-span-1 lg:h-[42rem]">
          <CardHeader className="border-b border-slate-200">
            <CardTitle>Percakapan</CardTitle>
            <div className="relative mt-2">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau telepon..."
                aria-label="Cari percakapan"
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-y-auto px-0 lg:max-h-none">
            {conversationsState.status === "loading" ? (
              <ConversationListSkeleton />
            ) : conversationsState.status === "error" ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <CircleAlertIcon className="size-9 text-rose-500" />
                <p className="mt-3 text-sm text-slate-600">{conversationsState.message}</p>
                <Button className="mt-4" size="sm" onClick={() => void loadConversations()}>
                  <RefreshCwIcon /> Coba lagi
                </Button>
              </div>
            ) : conversationsState.conversations.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <MessageCircleIcon className="mx-auto size-9 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-900">Belum ada percakapan</p>
                <p className="mt-1 text-sm text-slate-500">Percakapan pelanggan akan tampil di sini.</p>
              </div>
            ) : visibleConversations.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <SearchIcon className="mx-auto size-9 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-900">Percakapan tidak ditemukan</p>
                <p className="mt-1 text-sm text-slate-500">Coba nama atau nomor telepon lain.</p>
              </div>
            ) : (
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto xl:max-h-none">
                {visibleConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={cn(
                      "w-full min-w-0 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset",
                      selectedId === conversation.id && "bg-blue-50 hover:bg-blue-50",
                    )}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <p className="truncate font-semibold text-slate-950">{conversation.customerName}</p>
                      {conversation.lastMessageAt ? (
                        <time className="shrink-0 text-[0.6875rem] text-slate-500" dateTime={conversation.lastMessageAt}>
                          {dateTimeFormatter.format(new Date(conversation.lastMessageAt))}
                        </time>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {conversation.customerPhone ?? "Nomor telepon tidak tersedia"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-[42rem] min-w-0 border-slate-200 shadow-sm lg:col-span-2">
          {!selectedId || detailState.status === "idle" ? (
            <CardContent className="flex min-h-[32rem] flex-1 flex-col items-center justify-center text-center">
              <MessageCircleIcon className="size-11 text-slate-400" />
              <h2 className="mt-4 font-semibold text-slate-950">Pilih percakapan</h2>
              <p className="mt-2 text-sm text-slate-500">Pilih pelanggan untuk melihat dan membalas pesan.</p>
            </CardContent>
          ) : detailState.status === "loading" ? (
            <DetailSkeleton />
          ) : detailState.status === "error" ? (
            <CardContent className="flex min-h-[32rem] flex-1 flex-col items-center justify-center text-center">
              <CircleAlertIcon className="size-11 text-rose-500" />
              <h2 className="mt-4 font-semibold text-slate-950">Percakapan belum dapat dimuat</h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">{detailState.message}</p>
              <Button className="mt-5" onClick={() => void loadDetail(selectedId)}>
                <RefreshCwIcon /> Coba lagi
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-slate-200">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <UserIcon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{detailState.detail.conversation.customerName}</CardTitle>
                      <p className="truncate text-xs text-slate-500">
                        {detailState.detail.conversation.customerPhone ?? "Nomor telepon tidak tersedia"}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/admin/customers/${detailState.detail.conversation.customerId}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
                  >
                    Lihat pelanggan
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col px-0">
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
                  {detailState.detail.messages.map((message) => {
                    const isAdmin = message.senderId === detailState.detail.currentUserId;
                    return (
                      <div key={message.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%]",
                          isAdmin
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-slate-100 text-slate-900",
                        )}>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.body}</p>
                          <time dateTime={message.createdAt} className={cn(
                            "mt-1 block text-right text-[0.6875rem]",
                            isAdmin ? "text-blue-100" : "text-slate-500",
                          )}>
                            {messageTimeFormatter.format(new Date(message.createdAt))} WIB
                          </time>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form className="border-t border-slate-200 bg-white p-3 sm:p-4" onSubmit={handleSubmit}>
                  {sendError ? (
                    <Alert variant="destructive" className="mb-3">
                      <CircleAlertIcon />
                      <AlertDescription>{sendError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="flex min-w-0 items-end gap-2">
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
                        placeholder="Tulis balasan..."
                        aria-label="Balasan"
                        className="max-h-36 min-h-20 resize-none"
                        disabled={isSending}
                      />
                      <div className="mt-1 flex items-center justify-between gap-2 px-1 text-xs text-slate-500">
                        <span className="truncate">Enter untuk kirim · Shift+Enter untuk baris baru</span>
                        <span className="shrink-0 tabular-nums">{body.length}/2000</span>
                      </div>
                    </div>
                    <Button type="submit" size="lg" className="mb-6 shrink-0" disabled={isSending || !body.trim()}>
                      <SendIcon />
                      <span className="hidden sm:inline">{isSending ? "Mengirim..." : "Kirim"}</span>
                      <span className="sr-only sm:hidden">Kirim</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
