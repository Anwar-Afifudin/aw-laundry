import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  MapPinIcon,
  MessageSquareWarningIcon,
  PackageOpenIcon,
  PhoneIcon,
  RefreshCwIcon,
  StoreIcon,
  TruckIcon,
  WashingMachineIcon,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { getCurrentCustomerOrderDetail } from "~/features/orders/queries/get-current-customer-order-detail";
import { billingEstimateLabels, billingQuantityLabels, billingUnitLabels } from "~/features/orders/order-display";
import type {
  CustomerOrderDetail,
  CustomerOrderDetailItem,
  OrderAddressSnapshot,
  OrderPaymentStatus,
  OrderStatus,
} from "~/features/orders/types";
import { cn } from "~/lib/utils";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; order: CustomerOrderDetail }
  | { status: "not_found" }
  | { status: "error" };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
const paymentLabels: Record<OrderPaymentStatus, string> = {
  UNPAID: "Belum dibayar",
  PENDING: "Menunggu konfirmasi",
  PAID: "Sudah dibayar",
  FAILED: "Pembayaran gagal",
  REFUNDED: "Dana dikembalikan",
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const quantityFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });

function formatDateTime(value: string | null) {
  if (!value) return "Belum tersedia";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Belum tersedia" : dateTimeFormatter.format(date);
}

function AddressCard({ address }: { address: OrderAddressSnapshot }) {
  const location = [address.district, address.city, address.postalCode].filter(Boolean).join(", ");
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
      <div className="flex items-start gap-3">
        <MapPinIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-blue-600" />
        <div className="min-w-0">
          {address.label && <p className="font-semibold text-slate-900">{address.label}</p>}
          <p className="font-medium text-slate-800">{address.recipientName}</p>
          <p className="flex items-center gap-1.5"><PhoneIcon aria-hidden="true" className="size-3.5" />{address.phone}</p>
          <p className="break-words">{address.addressLine}</p>
          {location && <p>{location}</p>}
          {address.notes && <p className="mt-1 text-xs text-slate-500">Catatan alamat: {address.notes}</p>}
        </div>
      </div>
    </div>
  );
}

function LaundryItem({ item }: { item: CustomerOrderDetailItem }) {
  const usesFinalValue = item.actualQuantity !== null && item.finalSubtotal > 0;
  const unit = billingUnitLabels[item.billingUnit];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><WashingMachineIcon aria-hidden="true" className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-950">{item.serviceName}</h3>
          <p className="mt-1 text-sm text-slate-600">{rupiahFormatter.format(item.unitPrice)} / {unit}</p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">{billingEstimateLabels[item.billingUnit]}</dt><dd className="mt-0.5 font-semibold text-slate-900">{item.estimatedQuantity === null ? "Belum tersedia" : `${quantityFormatter.format(item.estimatedQuantity)} ${unit}`}</dd></div>
            <div><dt className="text-slate-500">{billingQuantityLabels[item.billingUnit]}</dt><dd className="mt-0.5 font-semibold text-slate-900">{item.actualQuantity === null ? "Belum diverifikasi" : `${quantityFormatter.format(item.actualQuantity)} ${unit}`}</dd></div>
            {item.billingUnit === "KG" && item.actualItemCount !== null && <div><dt className="text-slate-500">Jumlah pakaian</dt><dd className="mt-0.5 font-semibold text-slate-900">{quantityFormatter.format(item.actualItemCount)} pcs</dd></div>}
            <div><dt className="text-slate-500">Estimasi subtotal</dt><dd className="mt-0.5 font-semibold text-slate-900">{rupiahFormatter.format(item.estimatedSubtotal)}</dd></div>
            <div><dt className="text-slate-500">Subtotal final</dt><dd className="mt-0.5 font-semibold text-slate-900">{usesFinalValue ? rupiahFormatter.format(item.finalSubtotal) : "Belum tersedia"}</dd></div>
          </dl>
          {item.notes && <p className="mt-3 text-sm text-slate-600">Catatan item: {item.notes}</p>}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return <div aria-label="Memuat detail pesanan" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="space-y-6"><Skeleton className="h-52 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>
    <div className="space-y-6"><Skeleton className="h-72 w-full rounded-xl" /><Skeleton className="h-80 w-full rounded-xl" /></div>
  </div>;
}

function OrderDetailContent({ order }: { order: CustomerOrderDetail }) {
  const hasFinalPrice = order.finalTotal > 0;
  const shownTotal = hasFinalPrice ? order.finalTotal : order.estimatedTotal;

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Nomor pesanan</p><h2 className="mt-1 break-words text-xl font-bold text-slate-950">{order.orderNumber}</h2></div>
            <Badge variant="outline" className={cn("h-auto self-start py-1 ring-1", statusStyles[order.status])}>{statusLabels[order.status]}</Badge>
          </div>
          <Separator />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium text-slate-500">Tanggal dibuat</dt><dd className="mt-1 font-medium text-slate-900">{formatDateTime(order.createdAt)}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Estimasi selesai</dt><dd className="mt-1 font-medium text-slate-900">{formatDateTime(order.estimatedCompletionAt)}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Status pesanan</dt><dd className="mt-1 font-medium text-slate-900">{statusLabels[order.status]}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Status pembayaran</dt><dd className="mt-1 font-medium text-slate-900">{paymentLabels[order.paymentStatus]}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Detail Laundry</CardTitle></CardHeader><CardContent className="space-y-3">{order.items.map((item) => <LaundryItem key={item.id} item={item} />)}</CardContent></Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle>Pengambilan &amp; Pengantaran</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><p className="text-xs font-medium text-slate-500">Pengambilan</p><p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">{order.intakeMethod === "PICKUP" ? <TruckIcon aria-hidden="true" className="size-4 text-blue-600" /> : <StoreIcon aria-hidden="true" className="size-4 text-blue-600" />}{order.intakeMethod === "PICKUP" ? "Dijemput A&W Laundry" : "Antar sendiri"}</p>{order.intakeMethod === "PICKUP" && order.pickupAddress && <AddressCard address={order.pickupAddress} />}</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><p className="text-xs font-medium text-slate-500">Pengembalian</p><p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">{order.returnMethod === "DELIVERY" ? <TruckIcon aria-hidden="true" className="size-4 text-blue-600" /> : <PackageOpenIcon aria-hidden="true" className="size-4 text-blue-600" />}{order.returnMethod === "DELIVERY" ? "Diantar ke alamat" : "Ambil sendiri"}</p>{order.returnMethod === "DELIVERY" && order.deliveryAddress && <AddressCard address={order.deliveryAddress} />}</div>
        </CardContent>
      </Card>

      {order.specialInstructions && <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Catatan Laundry</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{order.specialInstructions}</p></CardContent></Card>}
    </div>

    <aside className="space-y-6 lg:sticky lg:top-24">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle>Ringkasan Biaya</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-600">Estimasi subtotal</span><span className="font-medium text-slate-900">{rupiahFormatter.format(order.estimatedSubtotal)}</span></div>
          {order.pickupFee > 0 && <div className="flex justify-between gap-4"><span className="text-slate-600">Biaya pengambilan</span><span className="font-medium text-slate-900">{rupiahFormatter.format(order.pickupFee)}</span></div>}
          {order.deliveryFee > 0 && <div className="flex justify-between gap-4"><span className="text-slate-600">Biaya pengantaran</span><span className="font-medium text-slate-900">{rupiahFormatter.format(order.deliveryFee)}</span></div>}
          {order.additionalCharge > 0 && <div className="flex justify-between gap-4"><span className="text-slate-600">Biaya tambahan</span><span className="font-medium text-slate-900">{rupiahFormatter.format(order.additionalCharge)}</span></div>}
          {order.discountAmount > 0 && <div className="flex justify-between gap-4"><span className="text-slate-600">Diskon</span><span className="font-medium text-emerald-700">−{rupiahFormatter.format(order.discountAmount)}</span></div>}
          <Separator />
          <div className="flex items-end justify-between gap-4"><span className="font-semibold text-slate-900">{hasFinalPrice ? "Total" : "Estimasi total"}</span><span className="text-lg font-bold text-blue-700">{rupiahFormatter.format(shownTotal)}</span></div>
          <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">Harga final ditentukan berdasarkan berat aktual setelah laundry ditimbang.</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Status Pesanan</CardTitle></CardHeader><CardContent>
        {order.statusHistory.length === 0 ? <p className="text-sm text-slate-600">Riwayat status belum tersedia.</p> : <ol className="space-y-0">{order.statusHistory.map((event, index) => {
          const isCurrent = event.status === order.status && index === order.statusHistory.length - 1;
          const isCompleted = event.status === "COMPLETED";
          return <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {index < order.statusHistory.length - 1 && <span aria-hidden="true" className="absolute top-6 bottom-0 left-2.5 w-px bg-slate-200" />}
            <span className={cn("relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full ring-4 ring-white", isCompleted ? "bg-emerald-600 text-white" : isCurrent ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600")}>{index < order.statusHistory.length - 1 || isCompleted ? <CheckIcon aria-hidden="true" className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}</span>
            <div className="min-w-0"><p className={cn("text-sm font-semibold", isCompleted ? "text-emerald-700" : isCurrent ? "text-blue-700" : "text-slate-900")}>{statusLabels[event.status]}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>{event.note && <p className="mt-1 break-words text-xs leading-5 text-slate-600">{event.note}</p>}</div>
          </li>;
        })}</ol>}
      </CardContent></Card>
    </aside>
  </div>;
}

export function meta() { return [{ title: "Detail Pesanan | A&W Laundry" }]; }

export default function CustomerOrderDetailPage() {
  const { orderId } = useParams();
  const [state, setState] = useState<DetailState>({ status: "loading" });

  const loadOrder = useCallback(async () => {
    if (!orderId || !uuidPattern.test(orderId)) { setState({ status: "not_found" }); return; }
    setState({ status: "loading" });
    try {
      const result = await getCurrentCustomerOrderDetail(orderId);
      setState(result.status === "found" ? { status: "ready", order: result.order } : { status: "not_found" });
    } catch { setState({ status: "error" }); }
  }, [orderId]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);

  return <div className="space-y-6">
    <Link to="/app/orders" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}><ArrowLeftIcon aria-hidden="true" /> Kembali ke Pesanan</Link>
    <PageHeader
      eyebrow="Aplikasi pelanggan"
      title="Detail Pesanan"
      description="Pantau informasi dan perkembangan laundry Anda."
      actions={state.status === "ready" ? (
        <Link
          to={`/app/complaints/new?orderId=${state.order.id}`}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <MessageSquareWarningIcon aria-hidden="true" /> Ajukan Komplain
        </Link>
      ) : undefined}
    />
    {state.status === "loading" ? <DetailSkeleton /> : state.status === "ready" ? <OrderDetailContent order={state.order} /> : state.status === "not_found" ? (
      <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center px-5 py-10"><ClipboardListIcon aria-hidden="true" className="size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Pesanan tidak ditemukan</h2><p className="mt-2 max-w-md text-sm text-slate-600">Pesanan mungkin tidak tersedia atau tidak dapat diakses oleh akun Anda.</p><Link to="/app/orders" className={cn(buttonVariants({ size: "lg" }), "mt-5")}><ArrowLeftIcon aria-hidden="true" /> Kembali ke Pesanan</Link></CardContent></Card>
    ) : (
      <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center px-5 py-10"><CircleAlertIcon aria-hidden="true" className="size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Detail pesanan belum dapat dimuat</h2><p className="mt-2 max-w-md text-sm text-slate-600">Terjadi gangguan saat memuat detail pesanan Anda. Silakan coba lagi.</p><button type="button" onClick={() => void loadOrder()} className={cn(buttonVariants({ size: "lg" }), "mt-5")}><RefreshCwIcon aria-hidden="true" /> Coba lagi</button></CardContent></Card>
    )}
  </div>;
}
