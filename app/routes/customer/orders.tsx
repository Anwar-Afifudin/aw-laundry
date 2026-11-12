import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClockIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  PackageOpenIcon,
  RefreshCwIcon,
  TruckIcon,
  WashingMachineIcon,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { getCurrentCustomerOrders } from "~/features/orders/queries/get-current-customer-orders";
import type {
  CustomerOrderItemSummary,
  CustomerOrderSummary,
  OrderStatus,
} from "~/features/orders/types";
import { cn } from "~/lib/utils";

type OrdersState =
  | { status: "loading" }
  | { status: "ready"; orders: CustomerOrderSummary[] }
  | { status: "error" };
type OrderFilter = "all" | "active" | "finished";

const terminalStatuses = new Set<OrderStatus>(["COMPLETED", "CANCELLED"]);
const statusLabels: Record<OrderStatus, string> = {
  ORDER_CREATED: "Pesanan dibuat",
  WAITING_PICKUP: "Menunggu penjemputan",
  PICKED_UP: "Laundry dijemput",
  RECEIVED: "Laundry diterima",
  WEIGHING: "Sedang ditimbang",
  WAITING_PROCESS: "Menunggu diproses",
  WASHING: "Sedang dicuci",
  DRYING: "Sedang dikeringkan",
  IRONING: "Sedang disetrika",
  QUALITY_CONTROL: "Pemeriksaan kualitas",
  PACKING: "Sedang dikemas",
  READY: "Siap dikembalikan",
  OUT_FOR_DELIVERY: "Dalam pengantaran",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
const statusStyles: Record<OrderStatus, string> = {
  ORDER_CREATED: "bg-blue-50 text-blue-700 ring-blue-200",
  WAITING_PICKUP: "bg-amber-50 text-amber-700 ring-amber-200",
  PICKED_UP: "bg-sky-50 text-sky-700 ring-sky-200",
  RECEIVED: "bg-sky-50 text-sky-700 ring-sky-200",
  WEIGHING: "bg-violet-50 text-violet-700 ring-violet-200",
  WAITING_PROCESS: "bg-amber-50 text-amber-700 ring-amber-200",
  WASHING: "bg-blue-50 text-blue-700 ring-blue-200",
  DRYING: "bg-blue-50 text-blue-700 ring-blue-200",
  IRONING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  QUALITY_CONTROL: "bg-violet-50 text-violet-700 ring-violet-200",
  PACKING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  READY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  OUT_FOR_DELIVERY: "bg-sky-50 text-sky-700 ring-sky-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "Asia/Jakarta",
});
const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const quantityFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

function formatQuantity(item: CustomerOrderItemSummary) {
  const quantity = item.actualQuantity ?? item.estimatedQuantity;
  if (quantity === null) return "Jumlah belum tersedia";

  const unitLabels = {
    PER_KG: "kg",
    PER_ITEM: "item",
    PER_METER: "meter",
    FIXED: "paket",
  } as const;
  return `${quantityFormatter.format(quantity)} ${unitLabels[item.priceType]}`;
}

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  const primaryItem = order.items[0];
  const additionalItemCount = Math.max(order.items.length - 1, 0);

  return (
    <Card className="overflow-hidden border-slate-200 py-0 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Nomor pesanan</p>
            <p className="mt-1 truncate text-base font-bold text-slate-950">{order.orderNumber}</p>
            <p className="mt-1 text-sm text-slate-500">Dibuat {dateFormatter.format(new Date(order.createdAt))}</p>
          </div>
          <Badge variant="outline" className={cn("h-auto self-start py-1 ring-1", statusStyles[order.status])}>
            {statusLabels[order.status]}
          </Badge>
        </div>

        <div className="grid gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <WashingMachineIcon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Layanan</p>
              <p className="mt-1 font-semibold text-slate-900">{primaryItem?.serviceName ?? "Layanan laundry"}</p>
              <p className="mt-1 text-sm text-slate-600">
                {primaryItem ? formatQuantity(primaryItem) : "Detail belum tersedia"}
                {additionalItemCount > 0 && ` · +${additionalItemCount} layanan`}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Estimasi total</p>
            <p className="mt-1 font-semibold text-slate-900">{rupiahFormatter.format(order.estimatedTotal)}</p>
            {order.estimatedCompletionAt && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
                <CalendarClockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>Estimasi selesai {dateTimeFormatter.format(new Date(order.estimatedCompletionAt))}</span>
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <p className="flex gap-2">
              <TruckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <span><span className="font-medium text-slate-700">Pengambilan:</span>{" "}{order.intakeMethod === "PICKUP" ? "Dijemput A&W Laundry" : "Antar sendiri"}</span>
            </p>
            <p className="flex gap-2">
              <PackageOpenIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <span><span className="font-medium text-slate-700">Pengembalian:</span>{" "}{order.returnMethod === "DELIVERY" ? "Diantar ke alamat" : "Ambil sendiri"}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <Link to={`/app/orders/${order.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
            Lihat Detail <ChevronRightIcon aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-label="Memuat pesanan" className="space-y-4">
      {[0, 1].map((item) => (
        <Card key={item} className="border-slate-200 py-0 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-48" /></div>
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {[0, 1, 2].map((column) => <Skeleton key={column} className="h-20 w-full" />)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function meta() {
  return [{ title: "Pesanan Saya | A&W Laundry" }];
}

export default function CustomerOrdersPage() {
  const [state, setState] = useState<OrdersState>({ status: "loading" });
  const [filter, setFilter] = useState<OrderFilter>("all");

  const loadOrders = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", orders: await getCurrentCustomerOrders() });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (state.status !== "ready") return [];
    if (filter === "all") return state.orders;
    return state.orders.filter((order) =>
      filter === "finished" ? terminalStatuses.has(order.status) : !terminalStatuses.has(order.status),
    );
  }, [filter, state]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Aplikasi pelanggan" title="Pesanan Saya" description="Lihat pesanan aktif dan riwayat laundry Anda." />

      {state.status === "loading" ? <OrdersSkeleton /> : state.status === "error" ? (
        <Card className="border-slate-200 text-center shadow-sm">
          <CardContent className="flex flex-col items-center px-5 py-8">
            <RefreshCwIcon aria-hidden="true" className="size-10 text-rose-500" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Pesanan belum dapat dimuat</h2>
            <p className="mt-2 max-w-md text-sm text-slate-600">Terjadi gangguan saat memuat pesanan Anda. Silakan coba lagi.</p>
            <button type="button" onClick={() => void loadOrders()} className={cn(buttonVariants({ size: "lg" }), "mt-5")}>
              <RefreshCwIcon aria-hidden="true" /> Coba lagi
            </button>
          </CardContent>
        </Card>
      ) : state.orders.length === 0 ? (
        <Card className="border-slate-200 text-center shadow-sm">
          <CardContent className="flex flex-col items-center px-5 py-10">
            <span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-700"><ClipboardListIcon aria-hidden="true" className="size-7" /></span>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Belum ada pesanan</h2>
            <p className="mt-2 max-w-md text-sm text-slate-600">Pesanan laundry yang Anda buat akan muncul di sini.</p>
            <Link to="/app/orders/new" className={cn(buttonVariants({ size: "lg" }), "mt-5")}>+ Buat Pesanan</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex w-full gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit" role="group" aria-label="Filter pesanan">
            {([['all', 'Semua'], ['active', 'Aktif'], ['finished', 'Selesai']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={cn("min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition-colors sm:flex-none", filter === value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}>{label}</button>
            ))}
          </div>
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">{filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)}</div>
          ) : (
            <Card className="border-dashed border-slate-300 text-center shadow-none"><CardContent className="py-10"><ClipboardListIcon aria-hidden="true" className="mx-auto size-9 text-slate-400" /><p className="mt-3 font-semibold text-slate-800">Tidak ada pesanan pada filter ini</p><p className="mt-1 text-sm text-slate-500">Pilih filter lain untuk melihat pesanan Anda.</p></CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
