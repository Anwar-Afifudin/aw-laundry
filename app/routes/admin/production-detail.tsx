import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CircleAlertIcon, CircleIcon, LoaderCircleIcon, PackageCheckIcon, PhoneIcon, RefreshCwIcon, UserIcon } from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatBillingQuantity, formatRupiah, orderStatusLabels, orderStatusStyles } from "~/features/orders/order-display";
import { updateAdminOrderItemProductionStatus } from "~/features/orders/mutations/update-admin-order-item-production-status";
import { getAdminOrderDetail } from "~/features/orders/queries/get-admin-order-detail";
import type { AdminOrderDetail, CustomerOrderDetailItem, OrderStatus, ProductionStatus } from "~/features/orders/types";
import { productionStatuses } from "~/features/production/queries/get-admin-production-orders";
import { cn } from "~/lib/utils";

type State = { status: "loading" } | { status: "ready"; order: AdminOrderDetail } | { status: "not_found" } | { status: "error" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const productionSet = new Set<OrderStatus>(productionStatuses);
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant="outline" className={cn("border-transparent ring-1", orderStatusStyles[status])}>{orderStatusLabels[status]}</Badge>;
}

function getNextProductionStep(item: CustomerOrderDetailItem): ProductionStatus | null {
  const steps = item.productionSteps ?? [];
  if (!steps.length || item.productionStatus === null || item.productionStatus === undefined) return null;
  if (item.productionStatus === "WAITING_PROCESS") return steps[0] ?? null;
  const currentIndex = steps.indexOf(item.productionStatus);
  return currentIndex < 0 ? null : steps[currentIndex + 1] ?? null;
}

function ProductionItemCard({ item, onUpdated }: { item: CustomerOrderDetailItem; onUpdated: () => Promise<void> }) {
  const nextStatus = useMemo(() => getNextProductionStep(item), [item]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const steps = item.productionSteps ?? [];
  const currentIndex = item.productionStatus && item.productionStatus !== "WAITING_PROCESS" ? steps.indexOf(item.productionStatus) : -1;
  const historyByStatus = new Map<ProductionStatus, string>();
  for (const event of item.productionHistory ?? []) {
    if (event.status !== "WAITING_PROCESS") historyByStatus.set(event.status, event.createdAt);
  }

  const advance = async () => {
    if (!nextStatus || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setSuccess(false);
    setError(null);
    try {
      await updateAdminOrderItemProductionStatus(item.id, nextStatus);
      await onUpdated();
      setSuccess(true);
    } catch {
      setError("Status layanan belum dapat diperbarui. Muat ulang halaman lalu coba lagi.");
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  };

  return <Card className="border-slate-200 shadow-sm">
    <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><CardTitle>{item.serviceName}</CardTitle><p className="mt-2 text-sm text-slate-600">{item.actualQuantity === null ? "Kuantitas aktual belum tersedia" : formatBillingQuantity(item.actualQuantity, item.billingUnit, item.actualItemCount)}<span className="mx-2 text-slate-300">|</span><span className="font-semibold text-blue-700">{formatRupiah(item.finalSubtotal)}</span></p></div>
      {item.productionStatus ? <StatusBadge status={item.productionStatus} /> : null}
    </CardHeader>
    <CardContent className="space-y-5">
      {steps.length ? <ol>{steps.map((step, index) => {
        const completed = index < currentIndex || item.productionStatus === "READY";
        const current = index === currentIndex && item.productionStatus !== "READY";
        const eventTime = historyByStatus.get(step);
        return <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
          {index < steps.length - 1 ? <span className="absolute top-5 bottom-0 left-2.5 w-px bg-slate-200" /> : null}
          <span className={cn("relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full ring-4 ring-white", completed && "bg-blue-600 text-white", current && "bg-amber-100 text-amber-700 ring-amber-50", !completed && !current && "bg-white text-slate-400 ring-slate-100")}>
            {completed ? <CheckIcon className="size-3" /> : current ? <ArrowRightIcon className="size-3" /> : <CircleIcon className="size-3" />}
          </span>
          <div><p className={cn("font-medium", current ? "text-amber-800" : "text-slate-800")}>{orderStatusLabels[step]}</p>{eventTime ? <p className="mt-1 text-xs text-slate-500">{dateTime.format(new Date(eventTime))}</p> : null}</div>
        </li>;
      })}</ol> : <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Workflow layanan tidak tersedia</AlertTitle></Alert>}
      {item.productionStatus === "READY" ? <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><PackageCheckIcon className="size-5" />Layanan ini sudah selesai diproduksi.</div> : nextStatus ? <Button className="w-full sm:w-auto" disabled={submitting} onClick={() => void advance()}>{submitting ? <LoaderCircleIcon className="animate-spin" /> : <ArrowRightIcon />}{submitting ? "Memperbarui..." : `Lanjut ke ${orderStatusLabels[nextStatus]}`}</Button> : <Alert><CircleAlertIcon /><AlertTitle>Layanan belum dapat diproses</AlertTitle><AlertDescription>Status layanan belum masuk antrean produksi atau data workflow tidak valid.</AlertDescription></Alert>}
      {success ? <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800"><CheckIcon /><AlertTitle>Status layanan diperbarui</AlertTitle></Alert> : null}
      {error ? <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Belum berhasil</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    </CardContent>
  </Card>;
}

function Loading() {
  return <div className="space-y-6"><Skeleton className="h-48 rounded-xl" />{[0, 1].map((value) => <Skeleton key={value} className="h-96 rounded-xl" />)}</div>;
}

function Content({ order, onUpdated }: { order: AdminOrderDetail; onUpdated: (order: AdminOrderDetail) => void }) {
  const refresh = async () => {
    const result = await getAdminOrderDetail(order.id);
    if (result.status !== "found") throw new Error("ORDER_NOT_FOUND");
    onUpdated(result.order);
  };
  return <div className="space-y-6">
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Informasi Pesanan</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div><p className="text-xs text-slate-500">Nomor pesanan</p><p className="mt-1 font-semibold">{order.orderNumber}</p></div>
      <div><p className="text-xs text-slate-500">Estimasi selesai</p><p className="mt-1 font-medium">{order.estimatedCompletionAt ? dateTime.format(new Date(order.estimatedCompletionAt)) : "Belum ditentukan"}</p></div>
      <p className="flex items-center gap-2"><UserIcon className="size-4 text-blue-600" />{order.customer.fullName}</p><p className="flex items-center gap-2"><PhoneIcon className="size-4 text-blue-600" />{order.customer.phone}</p>
      <div className="sm:col-span-2 lg:col-span-4"><p className="mb-2 text-xs text-slate-500">Status pesanan keseluruhan</p><StatusBadge status={order.status} /></div>
    </CardContent></Card>
    <section className="space-y-4" aria-labelledby="service-production-heading"><div><h2 id="service-production-heading" className="text-lg font-semibold text-slate-900">Progress per layanan</h2><p className="mt-1 text-sm text-slate-600">Setiap layanan mengikuti workflow produksinya sendiri.</p></div>{order.items.map((item) => <ProductionItemCard key={item.id} item={item} onUpdated={refresh} />)}</section>
  </div>;
}

export function meta() { return [{ title: "Detail Produksi Admin | A&W Laundry" }]; }

export default function AdminProductionDetailPage() {
  const { orderId } = useParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const load = useCallback(async () => {
    if (!orderId || !uuid.test(orderId)) { setState({ status: "not_found" }); return; }
    setState({ status: "loading" });
    try {
      const result = await getAdminOrderDetail(orderId);
      setState(result.status === "found" && productionSet.has(result.order.status) ? { status: "ready", order: result.order } : { status: "not_found" });
    } catch { setState({ status: "error" }); }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);
  return <div className="space-y-6">
    <Link to="/admin/production" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}><ArrowLeftIcon /> Kembali ke Produksi</Link>
    <PageHeader eyebrow="Operasional admin" title="Detail Produksi" description={state.status === "ready" ? state.order.orderNumber : "Lihat dan kelola progres produksi laundry."} actions={state.status === "ready" ? <StatusBadge status={state.order.status} /> : undefined} />
    {state.status === "loading" ? <Loading /> : state.status === "ready" ? <Content order={state.order} onUpdated={(order) => setState({ status: "ready", order })} /> : state.status === "not_found" ? <Card className="text-center"><CardContent className="py-12"><PackageCheckIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Produksi tidak ditemukan</h2><p className="mt-2 text-sm text-slate-600">Pesanan tidak tersedia atau tidak sedang berada dalam tahap produksi.</p></CardContent></Card> : <Card className="text-center"><CardContent className="py-12"><CircleAlertIcon className="mx-auto size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Detail produksi belum dapat dimuat</h2><Button className="mt-5" onClick={() => void load()}><RefreshCwIcon /> Coba lagi</Button></CardContent></Card>}
  </div>;
}
