import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheckIcon, CheckCircle2Icon, ChevronRightIcon, CircleAlertIcon,
  ClipboardListIcon, Clock3Icon, PackageOpenIcon, RefreshCwIcon, SearchIcon,
  TruckIcon, WashingMachineIcon,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { getAdminOrders } from "~/features/orders/queries/get-admin-orders";
import type { AdminOrderSummary, CustomerOrderItemSummary, OrderPaymentStatus, OrderStatus } from "~/features/orders/types";
import { cn } from "~/lib/utils";

type OrdersState = { status: "loading" } | { status: "ready"; orders: AdminOrderSummary[] } | { status: "error" };
type OrderFilter = "all" | "active" | "finished";

const terminalStatuses = new Set<OrderStatus>(["COMPLETED", "CANCELLED"]);
const statusLabels: Record<OrderStatus, string> = {
  ORDER_CREATED: "Pesanan dibuat", WAITING_PICKUP: "Menunggu penjemputan", PICKED_UP: "Laundry dijemput",
  RECEIVED: "Laundry diterima", WEIGHING: "Sedang ditimbang", WAITING_PROCESS: "Menunggu diproses",
  WASHING: "Sedang dicuci", DRYING: "Sedang dikeringkan", IRONING: "Sedang disetrika",
  QUALITY_CONTROL: "Pemeriksaan kualitas", PACKING: "Sedang dikemas", READY: "Siap dikembalikan",
  OUT_FOR_DELIVERY: "Dalam pengantaran", COMPLETED: "Selesai", CANCELLED: "Dibatalkan",
};
const statusStyles: Record<OrderStatus, string> = {
  ORDER_CREATED: "bg-blue-50 text-blue-700 ring-blue-200", WAITING_PICKUP: "bg-amber-50 text-amber-700 ring-amber-200",
  PICKED_UP: "bg-sky-50 text-sky-700 ring-sky-200", RECEIVED: "bg-sky-50 text-sky-700 ring-sky-200",
  WEIGHING: "bg-violet-50 text-violet-700 ring-violet-200", WAITING_PROCESS: "bg-amber-50 text-amber-700 ring-amber-200",
  WASHING: "bg-blue-50 text-blue-700 ring-blue-200", DRYING: "bg-blue-50 text-blue-700 ring-blue-200",
  IRONING: "bg-indigo-50 text-indigo-700 ring-indigo-200", QUALITY_CONTROL: "bg-violet-50 text-violet-700 ring-violet-200",
  PACKING: "bg-indigo-50 text-indigo-700 ring-indigo-200", READY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  OUT_FOR_DELIVERY: "bg-sky-50 text-sky-700 ring-sky-200", COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};
const paymentLabels: Record<OrderPaymentStatus, string> = {
  UNPAID: "Belum dibayar", PENDING: "Menunggu konfirmasi", PAID: "Lunas",
  FAILED: "Pembayaran gagal", REFUNDED: "Dikembalikan",
};
const paymentStyles: Record<OrderPaymentStatus, string> = {
  UNPAID: "bg-amber-50 text-amber-700 ring-amber-200", PENDING: "bg-blue-50 text-blue-700 ring-blue-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200", FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  REFUNDED: "bg-slate-100 text-slate-700 ring-slate-200",
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const jakartaDayFormatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" });
const rupiahFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const quantityFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });

function formatQuantity(item: CustomerOrderItemSummary | undefined) {
  if (!item) return "Belum tersedia";
  const quantity = item.actualQuantity ?? item.estimatedQuantity;
  if (quantity === null) return "Belum tersedia";
  const units = { PER_KG: "kg", PER_ITEM: "item", PER_METER: "meter", FIXED: "paket" } as const;
  return `${quantityFormatter.format(quantity)} ${units[item.priceType]}`;
}

function methodLabels(order: AdminOrderSummary) {
  return {
    intake: order.intakeMethod === "PICKUP" ? "Dijemput" : "Antar sendiri",
    return: order.returnMethod === "DELIVERY" ? "Diantar" : "Ambil sendiri",
  };
}

function StatusBadges({ order }: { order: AdminOrderSummary }) {
  return <div className="flex flex-wrap gap-1.5">
    <Badge variant="outline" className={cn("h-auto py-1 ring-1", statusStyles[order.status])}>{statusLabels[order.status]}</Badge>
    <Badge variant="outline" className={cn("h-auto py-1 ring-1", paymentStyles[order.paymentStatus])}>{paymentLabels[order.paymentStatus]}</Badge>
  </div>;
}

function SummaryCards({ orders }: { orders: AdminOrderSummary[] }) {
  const today = jakartaDayFormatter.format(new Date());
  const values = [
    { label: "Total Pesanan", value: orders.length, icon: ClipboardListIcon, iconClass: "bg-blue-50 text-blue-700" },
    { label: "Pesanan Aktif", value: orders.filter((order) => !terminalStatuses.has(order.status)).length, icon: Clock3Icon, iconClass: "bg-amber-50 text-amber-700" },
    { label: "Selesai", value: orders.filter((order) => order.status === "COMPLETED").length, icon: CheckCircle2Icon, iconClass: "bg-emerald-50 text-emerald-700" },
    { label: "Pesanan Hari Ini", value: orders.filter((order) => jakartaDayFormatter.format(new Date(order.createdAt)) === today).length, icon: CalendarCheckIcon, iconClass: "bg-violet-50 text-violet-700" },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {values.map(({ label, value, icon: Icon, iconClass }) => <Card key={label} className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconClass)}><Icon aria-hidden="true" className="size-5" /></span>
      </CardContent>
    </Card>)}
  </div>;
}

function MobileOrderCard({ order }: { order: AdminOrderSummary }) {
  const primaryItem = order.items[0];
  const extraItems = Math.max(order.items.length - 1, 0);
  const methods = methodLabels(order);
  return <Card className="border-slate-200 py-0 shadow-sm md:hidden"><CardContent className="p-0">
    <div className="border-b border-slate-100 p-4"><p className="font-bold text-slate-950">{order.orderNumber}</p><p className="mt-1 text-sm font-medium text-slate-700">{order.customerName}</p><div className="mt-3"><StatusBadges order={order} /></div></div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 text-sm">
      <div className="col-span-2"><dt className="text-xs font-medium text-slate-500">Layanan</dt><dd className="mt-1 font-medium text-slate-900">{primaryItem?.serviceName ?? "Layanan belum tersedia"}{extraItems > 0 ? ` +${extraItems} lainnya` : ""}</dd></div>
      <div><dt className="text-xs font-medium text-slate-500">Jumlah/berat</dt><dd className="mt-1 text-slate-800">{formatQuantity(primaryItem)}</dd></div>
      <div><dt className="text-xs font-medium text-slate-500">Estimasi total</dt><dd className="mt-1 font-semibold text-slate-900">{rupiahFormatter.format(order.estimatedTotal)}</dd></div>
      <div><dt className="text-xs font-medium text-slate-500">Dibuat</dt><dd className="mt-1 text-slate-800">{dateTimeFormatter.format(new Date(order.createdAt))}</dd></div>
      <div><dt className="text-xs font-medium text-slate-500">Estimasi selesai</dt><dd className="mt-1 text-slate-800">{order.estimatedCompletionAt ? dateTimeFormatter.format(new Date(order.estimatedCompletionAt)) : "Belum ditentukan"}</dd></div>
      <div className="col-span-2 space-y-1.5 text-slate-700"><p className="flex gap-2"><TruckIcon className="size-4 shrink-0 text-slate-400" />Penerimaan: {methods.intake}</p><p className="flex gap-2"><PackageOpenIcon className="size-4 shrink-0 text-slate-400" />Pengembalian: {methods.return}</p></div>
    </dl>
    <div className="border-t border-slate-100 bg-slate-50/70 p-3"><Link to={`/admin/orders/${order.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>Lihat Detail <ChevronRightIcon aria-hidden="true" /></Link></div>
  </CardContent></Card>;
}

function DesktopOrdersTable({ orders }: { orders: AdminOrderSummary[] }) {
  return <Card className="hidden border-slate-200 py-0 shadow-sm md:block"><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm">
    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase"><tr><th className="px-4 py-3">Pesanan &amp; customer</th><th className="px-4 py-3">Layanan</th><th className="px-4 py-3">Estimasi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Jadwal</th><th className="px-4 py-3">Metode</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
    <tbody className="divide-y divide-slate-100">{orders.map((order) => {
      const primaryItem = order.items[0]; const extraItems = Math.max(order.items.length - 1, 0); const methods = methodLabels(order);
      return <tr key={order.id} className="align-top hover:bg-slate-50/60">
        <td className="px-4 py-4"><p className="font-bold text-slate-950">{order.orderNumber}</p><p className="mt-1 max-w-44 truncate text-slate-600">{order.customerName}</p><p className="mt-1 text-xs text-slate-500">{dateTimeFormatter.format(new Date(order.createdAt))}</p></td>
        <td className="px-4 py-4"><p className="max-w-48 font-medium text-slate-900">{primaryItem?.serviceName ?? "Belum tersedia"}{extraItems > 0 ? ` +${extraItems}` : ""}</p><p className="mt-1 text-slate-500">{formatQuantity(primaryItem)}</p></td>
        <td className="px-4 py-4 font-semibold text-slate-900">{rupiahFormatter.format(order.estimatedTotal)}</td>
        <td className="px-4 py-4"><StatusBadges order={order} /></td>
        <td className="px-4 py-4 text-slate-600"><p className="text-xs text-slate-500">Estimasi selesai</p><p className="mt-1">{order.estimatedCompletionAt ? dateFormatter.format(new Date(order.estimatedCompletionAt)) : "Belum ditentukan"}</p></td>
        <td className="px-4 py-4 text-slate-600"><p>{methods.intake}</p><p className="mt-1">{methods.return}</p></td>
        <td className="px-4 py-4 text-right"><Link to={`/admin/orders/${order.id}`} className={buttonVariants({ variant: "outline" })}>Lihat Detail</Link></td>
      </tr>;
    })}</tbody>
  </table></div></Card>;
}

function OrdersSkeleton() {
  return <div aria-label="Memuat daftar pesanan" className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div><Skeleton className="h-12 w-full rounded-xl" /><Card className="border-slate-200 shadow-sm"><CardContent className="space-y-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</CardContent></Card></div>;
}

export function meta() { return [{ title: "Pesanan Admin | A&W Laundry" }]; }

export default function AdminOrdersPage() {
  const [state, setState] = useState<OrdersState>({ status: "loading" });
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const loadOrders = useCallback(async () => { setState({ status: "loading" }); try { setState({ status: "ready", orders: await getAdminOrders() }); } catch { setState({ status: "error" }); } }, []);
  useEffect(() => { void loadOrders(); }, [loadOrders]);
  const filteredOrders = useMemo(() => {
    if (state.status !== "ready") return [];
    const normalizedSearch = search.trim().toLocaleUpperCase("id-ID");
    return state.orders.filter((order) => {
      const matchesFilter = filter === "all" || (filter === "finished" ? terminalStatuses.has(order.status) : !terminalStatuses.has(order.status));
      return matchesFilter && (!normalizedSearch || order.orderNumber.toLocaleUpperCase("id-ID").includes(normalizedSearch));
    });
  }, [filter, search, state]);

  return <div className="space-y-6">
    <PageHeader eyebrow="Operasional admin" title="Pesanan" description="Pantau seluruh pesanan laundry, status proses, dan estimasi penyelesaian." />
    {state.status === "loading" ? <OrdersSkeleton /> : state.status === "error" ? <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center px-5 py-10"><CircleAlertIcon className="size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Pesanan belum dapat dimuat</h2><p className="mt-2 max-w-md text-sm text-slate-600">Terjadi gangguan saat mengambil data pesanan. Periksa koneksi dan coba lagi.</p><button type="button" onClick={() => void loadOrders()} className={cn(buttonVariants({ size: "lg" }), "mt-5")}><RefreshCwIcon aria-hidden="true" /> Coba lagi</button></CardContent></Card> : <>
      <SummaryCards orders={state.orders} />
      {state.orders.length === 0 ? <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center px-5 py-12"><span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-700"><ClipboardListIcon className="size-7" /></span><h2 className="mt-4 text-lg font-semibold text-slate-950">Belum ada pesanan</h2><p className="mt-2 max-w-md text-sm text-slate-600">Pesanan customer akan muncul di halaman ini setelah dibuat.</p></CardContent></Card> : <>
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit" role="group" aria-label="Filter pesanan">{([["all", "Semua"], ["active", "Aktif"], ["finished", "Selesai"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={cn("min-h-9 flex-1 rounded-md px-4 text-sm font-semibold transition-colors sm:flex-none", filter === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-950")}>{label}</button>)}</div>
          <div className="relative w-full lg:max-w-sm"><SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor pesanan..." aria-label="Cari berdasarkan nomor pesanan" className="h-10 bg-white pl-9" /></div>
        </div>
        {filteredOrders.length === 0 ? <Card className="border-dashed border-slate-300 text-center shadow-none"><CardContent className="py-12"><WashingMachineIcon className="mx-auto size-10 text-slate-400" /><p className="mt-3 font-semibold text-slate-800">Pesanan tidak ditemukan</p><p className="mt-1 text-sm text-slate-500">Ubah filter atau kata pencarian untuk melihat pesanan lain.</p></CardContent></Card> : <div className="space-y-4"><DesktopOrdersTable orders={filteredOrders} />{filteredOrders.map((order) => <MobileOrderCard key={order.id} order={order} />)}</div>}
      </>}
    </>}
  </div>;
}
