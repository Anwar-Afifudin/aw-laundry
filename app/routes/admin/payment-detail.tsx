import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon, CheckCircle2Icon, CircleAlertIcon, Clock3Icon,
  LoaderCircleIcon, PhoneIcon, ReceiptTextIcon, RefreshCwIcon, UserIcon,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { formatRupiah, orderStatusLabels, orderStatusStyles } from "~/features/orders/order-display";
import type { OrderPaymentStatus } from "~/features/orders/types";
import { updateAdminPayment } from "~/features/payments/mutations/update-admin-payment";
import { paymentMethodLabels, paymentStatusLabels, paymentStatusStyles } from "~/features/payments/payment-display";
import { getAdminPaymentDetail } from "~/features/payments/queries/get-admin-payment-detail";
import type { AdminPaymentDetail, PaymentMethod } from "~/features/payments/types";
import { cn } from "~/lib/utils";

type DetailState = { status: "loading" } | { status: "ready"; payment: AdminPaymentDetail } | { status: "not_found" } | { status: "error" };
type MutablePaymentStatus = Extract<OrderPaymentStatus, "PENDING" | "PAID" | "FAILED">;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });
const methods = Object.entries(paymentMethodLabels) as Array<[PaymentMethod, string]>;

function PaymentBadge({ status }: { status: OrderPaymentStatus }) { return <Badge variant="outline" className={cn("h-auto py-1 ring-1", paymentStatusStyles[status])}>{paymentStatusLabels[status]}</Badge>; }

function PaymentActions({ payment, onUpdated }: { payment: AdminPaymentDetail; onUpdated: (payment: AdminPaymentDetail) => void }) {
  const [method, setMethod] = useState<PaymentMethod>(payment.latestPayment?.method ?? "CASH");
  const [notes, setNotes] = useState(payment.latestPayment?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null); const saving = useRef(false);
  useEffect(() => { setMethod(payment.latestPayment?.method ?? "CASH"); setNotes(payment.latestPayment?.notes ?? ""); }, [payment]);
  const finalReady = payment.finalTotal > 0;
  const terminal = payment.paymentStatus === "PAID" || payment.paymentStatus === "REFUNDED";
  const update = async (status: MutablePaymentStatus) => {
    if (saving.current || terminal || !finalReady) return;
    saving.current = true; setIsSaving(true); setError(null); setSuccess(null);
    try {
      await updateAdminPayment({ orderId: payment.orderId, status, method, notes: notes.trim() || null });
      const result = await getAdminPaymentDetail(payment.orderId);
      if (result.status !== "found") throw new Error();
      onUpdated(result.payment); setSuccess(status === "PAID" ? "Pembayaran berhasil dikonfirmasi lunas." : status === "PENDING" ? "Pembayaran ditandai menunggu verifikasi." : "Pembayaran ditandai gagal.");
    } catch { setError("Status pembayaran belum dapat diperbarui. Periksa data lalu coba lagi."); }
    finally { saving.current = false; setIsSaving(false); }
  };
  if (terminal) return <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Status pembayaran ini sudah final dan tidak dapat diubah dari halaman ini.</div>;
  return <div className="space-y-4"><div><label htmlFor="payment-method" className="text-sm font-medium">Metode pembayaran</label><select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} disabled={isSaving} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="payment-notes" className="text-sm font-medium">Catatan internal (opsional)</label><Textarea id="payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} disabled={isSaving} placeholder="Contoh: pembayaran diterima oleh kasir" className="mt-2" /></div>{!finalReady && <Alert className="border-amber-200 bg-amber-50 text-amber-800"><Clock3Icon /><AlertTitle>Harga final belum tersedia</AlertTitle><AlertDescription>Verifikasi berat dan harga final pesanan sebelum mencatat pembayaran.</AlertDescription></Alert>}<div className="grid gap-2 sm:grid-cols-2">{payment.paymentStatus !== "PENDING" && <Button variant="outline" disabled={isSaving || !finalReady} onClick={() => void update("PENDING")}>{isSaving ? <LoaderCircleIcon className="animate-spin" /> : null}Menunggu Verifikasi</Button>}<Button disabled={isSaving || !finalReady} onClick={() => void update("PAID")}>{isSaving ? <LoaderCircleIcon className="animate-spin" /> : <CheckCircle2Icon />}Konfirmasi Lunas</Button>{payment.paymentStatus === "PENDING" && <Button variant="destructive" className="sm:col-span-2" disabled={isSaving} onClick={() => void update("FAILED")}>Tandai Gagal</Button>}</div>{success && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800"><CheckCircle2Icon /><AlertTitle>Berhasil</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}{error && <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Belum berhasil</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}</div>;
}

function DetailContent({ payment, onUpdated }: { payment: AdminPaymentDetail; onUpdated: (payment: AdminPaymentDetail) => void }) {
  const paidAt = payment.latestPayment?.paidAt;
  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-6"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Informasi Pesanan</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Nomor pesanan</p><p className="mt-1 font-semibold">{payment.orderNumber}</p></div><div><p className="text-xs text-slate-500">Tanggal pesanan</p><p className="mt-1">{dateTime.format(new Date(payment.orderCreatedAt))}</p></div><div><p className="text-xs text-slate-500">Status pesanan</p><Badge variant="outline" className={cn("mt-2 h-auto py-1 ring-1", orderStatusStyles[payment.orderStatus])}>{orderStatusLabels[payment.orderStatus]}</Badge></div><div><p className="text-xs text-slate-500">Status pembayaran</p><div className="mt-2"><PaymentBadge status={payment.paymentStatus} /></div></div></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Pelanggan</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><p className="flex items-center gap-2"><UserIcon className="size-4 text-blue-600" />{payment.customerName}</p><p className="flex items-center gap-2"><PhoneIcon className="size-4 text-blue-600" />{payment.customerPhone}</p></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Riwayat Transaksi</CardTitle></CardHeader><CardContent>{payment.payments.length === 0 ? <p className="text-sm text-slate-500">Belum ada transaksi pembayaran yang dicatat.</p> : <div className="space-y-3">{payment.payments.map((transaction) => <div key={transaction.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{formatRupiah(transaction.amount)}</p><p className="mt-1 text-sm text-slate-500">{paymentMethodLabels[transaction.method]} · {dateTime.format(new Date(transaction.paidAt ?? transaction.createdAt))}</p></div><PaymentBadge status={transaction.status} /></div>{transaction.notes && <p className="mt-3 text-sm text-slate-600">{transaction.notes}</p>}</div>)}</div>}</CardContent></Card></div><aside className="space-y-6 lg:sticky lg:top-24"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Ringkasan Pembayaran</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-600">Subtotal estimasi</span><span>{formatRupiah(payment.estimatedSubtotal)}</span></div><div className="flex justify-between gap-4"><span className="text-slate-600">Total estimasi</span><span>{formatRupiah(payment.estimatedTotal)}</span></div><div className="flex justify-between gap-4"><span className="text-slate-600">Subtotal final</span><span>{payment.finalSubtotal > 0 ? formatRupiah(payment.finalSubtotal) : "-"}</span></div><div className="flex justify-between gap-4 border-t border-slate-200 pt-3 font-bold"><span>Total final</span><span className="text-blue-700">{payment.finalTotal > 0 ? formatRupiah(payment.finalTotal) : "-"}</span></div><div className="flex justify-between gap-4"><span className="text-slate-600">Metode</span><span className="text-right">{payment.latestPayment ? paymentMethodLabels[payment.latestPayment.method] : "-"}</span></div><div className="flex justify-between gap-4"><span className="text-slate-600">Tanggal pembayaran</span><span className="text-right">{paidAt ? dateTime.format(new Date(paidAt)) : "-"}</span></div><PaymentBadge status={payment.paymentStatus} /></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Kelola Pembayaran</CardTitle></CardHeader><CardContent><PaymentActions payment={payment} onUpdated={onUpdated} /></CardContent></Card></aside></div>;
}

function DetailSkeleton() { return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-6">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-48 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div>; }
export function meta() { return [{ title: "Detail Pembayaran Admin | A&W Laundry" }]; }

export default function AdminPaymentDetailPage() {
  const { orderId } = useParams(); const [state, setState] = useState<DetailState>({ status: "loading" });
  const load = useCallback(async () => { if (!orderId || !uuidPattern.test(orderId)) { setState({ status: "not_found" }); return; } setState({ status: "loading" }); try { const result = await getAdminPaymentDetail(orderId); setState(result.status === "found" ? { status: "ready", payment: result.payment } : { status: "not_found" }); } catch { setState({ status: "error" }); } }, [orderId]);
  useEffect(() => { void load(); }, [load]);
  return <div className="space-y-6"><Link to="/admin/payments" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}><ArrowLeftIcon /> Kembali ke Pembayaran</Link><PageHeader eyebrow="Keuangan admin" title="Detail Pembayaran" description={state.status === "ready" ? state.payment.orderNumber : "Lihat dan kelola pembayaran pesanan."} actions={state.status === "ready" ? <PaymentBadge status={state.payment.paymentStatus} /> : undefined} />{state.status === "loading" ? <DetailSkeleton /> : state.status === "ready" ? <DetailContent payment={state.payment} onUpdated={(payment) => setState({ status: "ready", payment })} /> : state.status === "not_found" ? <Card className="text-center"><CardContent className="py-12"><ReceiptTextIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Pembayaran tidak ditemukan</h2><p className="mt-2 text-sm text-slate-600">Pesanan tidak tersedia atau tidak dapat diakses.</p></CardContent></Card> : <Card className="text-center"><CardContent className="py-12"><CircleAlertIcon className="mx-auto size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Detail pembayaran belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat mengambil data pembayaran.</p><button onClick={() => void load()} className={cn(buttonVariants(), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card>}</div>;
}
