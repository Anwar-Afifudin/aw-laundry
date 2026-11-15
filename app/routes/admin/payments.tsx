import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BanknoteIcon, CheckCircle2Icon, ChevronRightIcon, CircleAlertIcon,
  Clock3Icon, ReceiptTextIcon, RefreshCwIcon, SearchIcon, WalletCardsIcon,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { formatRupiah } from "~/features/orders/order-display";
import type { OrderPaymentStatus } from "~/features/orders/types";
import { paymentMethodLabels, paymentStatusLabels, paymentStatusStyles } from "~/features/payments/payment-display";
import { calculateAdminPaidRevenue } from "~/features/payments/payment-totals";
import { getAdminPayments } from "~/features/payments/queries/get-admin-payments";
import type { AdminPaymentSummary } from "~/features/payments/types";
import { cn } from "~/lib/utils";

type PaymentsState = { status: "loading" } | { status: "ready"; payments: AdminPaymentSummary[] } | { status: "error" };
type PaymentFilter = "ALL" | OrderPaymentStatus;
const filters: Array<{ value: PaymentFilter; label: string }> = [
  { value: "ALL", label: "Semua" }, { value: "UNPAID", label: "Belum Dibayar" },
  { value: "PENDING", label: "Menunggu Verifikasi" }, { value: "PAID", label: "Lunas" },
  { value: "FAILED", label: "Gagal" }, { value: "REFUNDED", label: "Dibatalkan/Dikembalikan" },
];
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

function paymentTotal(payment: AdminPaymentSummary) { return payment.finalTotal > 0 ? payment.finalTotal : payment.estimatedTotal; }
function PaymentBadge({ status }: { status: OrderPaymentStatus }) { return <Badge variant="outline" className={cn("h-auto py-1 ring-1", paymentStatusStyles[status])}>{paymentStatusLabels[status]}</Badge>; }

function SummaryCards({ payments }: { payments: AdminPaymentSummary[] }) {
  const values = [
    { label: "Total Transaksi", value: String(payments.reduce((total, item) => total + item.transactionCount, 0)), icon: ReceiptTextIcon, color: "bg-blue-50 text-blue-700" },
    { label: "Belum Dibayar", value: String(payments.filter((item) => item.paymentStatus === "UNPAID").length), icon: WalletCardsIcon, color: "bg-amber-50 text-amber-700" },
    { label: "Menunggu Verifikasi", value: String(payments.filter((item) => item.paymentStatus === "PENDING").length), icon: Clock3Icon, color: "bg-sky-50 text-sky-700" },
    { label: "Lunas", value: String(payments.filter((item) => item.paymentStatus === "PAID").length), icon: CheckCircle2Icon, color: "bg-emerald-50 text-emerald-700" },
    { label: "Total Pendapatan", value: formatRupiah(calculateAdminPaidRevenue(payments)), icon: BanknoteIcon, color: "bg-violet-50 text-violet-700" },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{values.map(({ label, value, icon: Icon, color }) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 truncate text-xl font-bold text-slate-950">{value}</p></div><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", color)}><Icon className="size-5" /></span></CardContent></Card>)}</div>;
}

function MobilePaymentCard({ payment }: { payment: AdminPaymentSummary }) {
  const displayDate = payment.latestPayment?.paidAt ?? payment.orderCreatedAt;
  return <Card className="border-slate-200 py-0 shadow-sm md:hidden"><CardContent className="p-0"><div className="border-b border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-950">{payment.orderNumber}</p><p className="mt-1 text-sm text-slate-600">{payment.customerName}</p></div><PaymentBadge status={payment.paymentStatus} /></div></div><dl className="grid grid-cols-2 gap-4 p-4 text-sm"><div><dt className="text-xs text-slate-500">Total</dt><dd className="mt-1 font-semibold">{formatRupiah(paymentTotal(payment))}</dd></div><div><dt className="text-xs text-slate-500">Metode</dt><dd className="mt-1">{payment.latestPayment ? paymentMethodLabels[payment.latestPayment.method] : "-"}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-500">Tanggal</dt><dd className="mt-1">{dateTime.format(new Date(displayDate))}</dd></div></dl><div className="border-t border-slate-100 bg-slate-50/70 p-3"><Link to={`/admin/payments/${payment.orderId}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>Lihat Detail <ChevronRightIcon /></Link></div></CardContent></Card>;
}

function PaymentsTable({ payments }: { payments: AdminPaymentSummary[] }) {
  return <Card className="hidden border-slate-200 py-0 shadow-sm md:block"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase"><tr><th className="px-4 py-3">Pesanan &amp; Pelanggan</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Metode</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map((payment) => { const displayDate = payment.latestPayment?.paidAt ?? payment.orderCreatedAt; return <tr key={payment.orderId} className="hover:bg-slate-50/60"><td className="px-4 py-4"><p className="font-bold text-slate-950">{payment.orderNumber}</p><p className="mt-1 text-slate-600">{payment.customerName}</p></td><td className="px-4 py-4 font-semibold text-slate-950">{formatRupiah(paymentTotal(payment))}</td><td className="px-4 py-4 text-slate-700">{payment.latestPayment ? paymentMethodLabels[payment.latestPayment.method] : "-"}</td><td className="px-4 py-4"><PaymentBadge status={payment.paymentStatus} /></td><td className="px-4 py-4 text-slate-600">{dateTime.format(new Date(displayDate))}</td><td className="px-4 py-4 text-right"><Link to={`/admin/payments/${payment.orderId}`} className={buttonVariants({ variant: "outline" })}>Lihat Detail</Link></td></tr>; })}</tbody></table></div></Card>;
}

function PaymentsSkeleton() { return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>; }
export function meta() { return [{ title: "Pembayaran Admin | A&W Laundry" }]; }

export default function AdminPaymentsPage() {
  const [state, setState] = useState<PaymentsState>({ status: "loading" }); const [filter, setFilter] = useState<PaymentFilter>("ALL"); const [search, setSearch] = useState("");
  const load = useCallback(async () => { setState({ status: "loading" }); try { setState({ status: "ready", payments: await getAdminPayments() }); } catch { setState({ status: "error" }); } }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => { if (state.status !== "ready") return []; const query = search.trim().toLocaleLowerCase("id-ID"); return state.payments.filter((payment) => (filter === "ALL" || payment.paymentStatus === filter) && (!query || payment.orderNumber.toLocaleLowerCase("id-ID").includes(query) || payment.customerName.toLocaleLowerCase("id-ID").includes(query))); }, [filter, search, state]);
  return <div className="space-y-6"><PageHeader eyebrow="Keuangan admin" title="Pembayaran" description="Kelola dan pantau pembayaran pesanan A&W Laundry." />{state.status === "loading" ? <PaymentsSkeleton /> : state.status === "error" ? <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center py-12"><CircleAlertIcon className="size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Pembayaran belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat mengambil data pembayaran.</p><button type="button" onClick={() => void load()} className={cn(buttonVariants(), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card> : <><SummaryCards payments={state.payments} />{state.payments.length === 0 ? <Card className="border-slate-200 text-center shadow-sm"><CardContent className="py-12"><WalletCardsIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Belum ada pembayaran</h2><p className="mt-2 text-sm text-slate-600">Pesanan customer akan muncul di sini setelah dibuat.</p></CardContent></Card> : <><div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter pembayaran">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={cn("min-h-9 shrink-0 rounded-lg px-3 text-sm font-semibold", filter === item.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:text-slate-950")}>{item.label}</button>)}</div><div className="relative max-w-md"><SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor pesanan atau pelanggan..." aria-label="Cari nomor pesanan atau nama pelanggan" className="h-10 bg-white pl-9" /></div></div>{filtered.length === 0 ? <Card className="border-dashed border-slate-300 text-center shadow-none"><CardContent className="py-12"><SearchIcon className="mx-auto size-10 text-slate-400" /><p className="mt-3 font-semibold">Pembayaran tidak ditemukan</p><p className="mt-1 text-sm text-slate-500">Ubah filter atau kata pencarian.</p></CardContent></Card> : <div className="space-y-4"><PaymentsTable payments={filtered} />{filtered.map((payment) => <MobilePaymentCard key={payment.orderId} payment={payment} />)}</div>}</>}</>}</div>;
}
