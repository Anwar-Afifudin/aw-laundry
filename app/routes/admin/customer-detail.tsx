import { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon, BanknoteIcon, CheckCircle2Icon, CircleAlertIcon, Clock3Icon, ExternalLinkIcon, MailIcon, MapPinIcon, PhoneIcon, RefreshCwIcon, ShoppingBagIcon, UserIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { getAdminCustomerDetail } from "~/features/customers/queries/get-admin-customer-detail";
import type { AdminCustomerDetail, CustomerOrderHistoryItem } from "~/features/customers/types";
import { formatRupiah, getOrderDisplayTotal, orderStatusLabels, orderStatusStyles } from "~/features/orders/order-display";
import { paymentStatusLabels, paymentStatusStyles } from "~/features/payments/payment-display";
import { cn } from "~/lib/utils";

type DetailState = { status: "loading" } | { status: "ready"; customer: AdminCustomerDetail } | { status: "not_found" } | { status: "error" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });
const dateOnly = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

function SummaryCards({ customer }: { customer: AdminCustomerDetail }) {
  const items = [
    { label: "Total Pesanan", value: String(customer.orderCount), icon: ShoppingBagIcon, style: "bg-blue-50 text-blue-700" },
    { label: "Pesanan Selesai", value: String(customer.completedOrderCount), icon: CheckCircle2Icon, style: "bg-emerald-50 text-emerald-700" },
    { label: "Pesanan Aktif", value: String(customer.activeOrderCount), icon: Clock3Icon, style: "bg-amber-50 text-amber-700" },
    { label: "Pembayaran Diterima", value: formatRupiah(customer.paidTransactionTotal), icon: BanknoteIcon, style: "bg-violet-50 text-violet-700" },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(({ label, value, icon: Icon, style }) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 truncate text-xl font-bold text-slate-950">{value}</p></div><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", style)}><Icon className="size-5" /></span></CardContent></Card>)}</div>;
}

function OrderBadges({ order }: { order: CustomerOrderHistoryItem }) { return <div className="flex flex-wrap gap-2"><Badge variant="outline" className={cn("h-auto py-1 ring-1", orderStatusStyles[order.status])}>{orderStatusLabels[order.status]}</Badge><Badge variant="outline" className={cn("h-auto py-1 ring-1", paymentStatusStyles[order.paymentStatus])}>{paymentStatusLabels[order.paymentStatus]}</Badge></div>; }
function serviceLabel(order: CustomerOrderHistoryItem) { return order.services.length > 0 ? order.services.join(", ") : "Layanan tidak tersedia"; }
function addressLabel(address: NonNullable<AdminCustomerDetail["address"]>) {
  return [address.addressLine, address.district, address.city, address.postalCode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function OrderHistory({ orders }: { orders: CustomerOrderHistoryItem[] }) {
  if (orders.length === 0) return <Card className="border-dashed border-slate-300 text-center shadow-none"><CardContent className="py-12"><ShoppingBagIcon className="mx-auto size-10 text-slate-400" /><h3 className="mt-3 font-semibold">Belum ada riwayat pesanan</h3><p className="mt-1 text-sm text-slate-500">Pelanggan ini belum pernah membuat pesanan.</p></CardContent></Card>;
  return <div className="space-y-4"><Card className="hidden border-slate-200 py-0 shadow-sm md:block"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase"><tr><th className="px-4 py-3">Pesanan</th><th className="px-4 py-3">Layanan</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Dibuat</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{orders.map((order) => <tr key={order.id} className="hover:bg-slate-50/60"><td className="px-4 py-4 font-bold">{order.orderNumber}</td><td className="max-w-64 px-4 py-4 text-slate-700">{serviceLabel(order)}</td><td className="px-4 py-4 font-semibold">{formatRupiah(getOrderDisplayTotal(order))}</td><td className="px-4 py-4"><OrderBadges order={order} /></td><td className="px-4 py-4 text-slate-600">{dateTime.format(new Date(order.createdAt))}</td><td className="px-4 py-4 text-right"><Link to={`/admin/orders/${order.id}`} className={buttonVariants({ variant: "outline" })}>Lihat Pesanan <ExternalLinkIcon /></Link></td></tr>)}</tbody></table></div></Card>{orders.map((order) => <Card key={order.id} className="border-slate-200 py-0 shadow-sm md:hidden"><CardContent className="p-0"><div className="border-b border-slate-100 p-4"><p className="font-bold">{order.orderNumber}</p><p className="mt-1 text-sm text-slate-600">{serviceLabel(order)}</p><div className="mt-3"><OrderBadges order={order} /></div></div><dl className="grid grid-cols-2 gap-4 p-4 text-sm"><div><dt className="text-xs text-slate-500">Total</dt><dd className="mt-1 font-semibold">{formatRupiah(getOrderDisplayTotal(order))}</dd></div><div><dt className="text-xs text-slate-500">Tanggal dibuat</dt><dd className="mt-1">{dateOnly.format(new Date(order.createdAt))}</dd></div></dl><div className="border-t border-slate-100 bg-slate-50/70 p-3"><Link to={`/admin/orders/${order.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>Lihat Pesanan <ExternalLinkIcon /></Link></div></CardContent></Card>)}</div>;
}

function CustomerContent({ customer }: { customer: AdminCustomerDetail }) {
  const address = customer.address;
  return <><SummaryCards customer={customer} /><div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-4"><h2 className="text-lg font-bold text-slate-950">Riwayat Pesanan</h2><OrderHistory orders={customer.orders} /></div><aside className="space-y-6 lg:sticky lg:top-24"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Informasi Pelanggan</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><p className="flex items-start gap-3"><UserIcon className="mt-0.5 size-4 shrink-0 text-blue-600" /><span><span className="block text-xs text-slate-500">Nama</span><span className="mt-1 block font-medium">{customer.fullName}</span></span></p><p className="flex items-start gap-3"><MailIcon className="mt-0.5 size-4 shrink-0 text-blue-600" /><span><span className="block text-xs text-slate-500">Email</span><span className="mt-1 block">{customer.email ?? "Tidak tersedia"}</span></span></p><p className="flex items-start gap-3"><PhoneIcon className="mt-0.5 size-4 shrink-0 text-blue-600" /><span><span className="block text-xs text-slate-500">Nomor HP</span><span className="mt-1 block">{customer.phone ?? "Tidak tersedia"}</span></span></p><p className="flex items-start gap-3"><Clock3Icon className="mt-0.5 size-4 shrink-0 text-blue-600" /><span><span className="block text-xs text-slate-500">Tanggal bergabung</span><span className="mt-1 block">{dateOnly.format(new Date(customer.joinedAt))}</span></span></p><p className="flex items-start gap-3"><ShoppingBagIcon className="mt-0.5 size-4 shrink-0 text-blue-600" /><span><span className="block text-xs text-slate-500">Pesanan terakhir</span><span className="mt-1 block">{customer.lastOrderAt ? dateTime.format(new Date(customer.lastOrderAt)) : "Belum ada pesanan"}</span></span></p></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Alamat Terakhir</CardTitle></CardHeader><CardContent>{address ? <div className="flex items-start gap-3 text-sm"><MapPinIcon className="mt-0.5 size-4 shrink-0 text-blue-600" /><div><p className="font-semibold">{address.label ?? "Alamat pelanggan"}</p><p className="mt-1 leading-6 text-slate-600">{addressLabel(address)}</p></div></div> : <p className="text-sm text-slate-500">Alamat belum tersedia dari riwayat pesanan.</p>}</CardContent></Card></aside></div></>;
}

function DetailSkeleton() { return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div></div>; }
export function meta() { return [{ title: "Detail Pelanggan Admin | A&W Laundry" }]; }

export default function AdminCustomerDetailPage() {
  const { customerId } = useParams();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const load = useCallback(async () => { if (!customerId || !uuidPattern.test(customerId)) { setState({ status: "not_found" }); return; } setState({ status: "loading" }); try { const result = await getAdminCustomerDetail(customerId); setState(result.status === "found" ? { status: "ready", customer: result.customer } : { status: "not_found" }); } catch { setState({ status: "error" }); } }, [customerId]);
  useEffect(() => { void load(); }, [load]);
  return <div className="space-y-6"><Link to="/admin/customers" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}><ArrowLeftIcon /> Kembali ke Pelanggan</Link><PageHeader eyebrow="Relasi pelanggan" title={state.status === "ready" ? state.customer.fullName : "Detail Pelanggan"} description="Profil, ringkasan transaksi, dan riwayat pesanan pelanggan." />{state.status === "loading" ? <DetailSkeleton /> : state.status === "ready" ? <CustomerContent customer={state.customer} /> : state.status === "not_found" ? <Card className="text-center"><CardContent className="py-12"><UserIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Pelanggan tidak ditemukan</h2><p className="mt-2 text-sm text-slate-600">Pelanggan tidak tersedia atau tidak dapat diakses.</p></CardContent></Card> : <Card className="text-center"><CardContent className="py-12"><CircleAlertIcon className="mx-auto size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Detail pelanggan belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat mengambil data pelanggan.</p><button type="button" onClick={() => void load()} className={cn(buttonVariants(), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card>}</div>;
}
