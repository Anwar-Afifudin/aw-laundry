import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  BanknoteIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  Clock3Icon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  getAdminDashboard,
  type AdminDashboardData,
} from "~/features/admin/dashboard/queries/get-admin-dashboard";
import {
  formatOrderDate,
  formatOrderQuantity,
  formatRupiah,
  getOrderDisplayTotal,
  orderStatusLabels,
  orderStatusStyles,
} from "~/features/orders/order-display";
import type { AdminOrderSummary } from "~/features/orders/types";
import { cn } from "~/lib/utils";

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; data: AdminDashboardData }
  | { status: "error" };

type KpiCardProps = {
  label: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: "true" }>;
  iconClass: string;
};

function KpiCard({ label, value, description, icon: Icon, iconClass }: KpiCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ order }: { order: AdminOrderSummary }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-auto py-1 ring-1", orderStatusStyles[order.status])}
    >
      {orderStatusLabels[order.status]}
    </Badge>
  );
}

function RecentOrderMobile({ order }: { order: AdminOrderSummary }) {
  const item = order.items[0];
  return (
    <Card className="border-slate-200 py-0 shadow-sm md:hidden">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div className="min-w-0">
            <p className="font-bold text-slate-950">{order.orderNumber}</p>
            <p className="mt-1 truncate text-sm text-slate-600">{order.customerName}</p>
          </div>
          <StatusBadge order={order} />
        </div>
        <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Layanan</dt>
            <dd className="mt-1 font-medium text-slate-900">{item?.serviceName ?? "Belum tersedia"}</dd>
            <dd className="mt-0.5 text-slate-500">{formatOrderQuantity(item)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Total</dt>
            <dd className="mt-1 font-semibold text-slate-900">{formatRupiah(getOrderDisplayTotal(order))}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tanggal</dt>
            <dd className="mt-1 text-slate-700">{formatOrderDate(order.createdAt)}</dd>
          </div>
        </dl>
        <div className="border-t border-slate-100 bg-slate-50/70 p-3">
          <Link to={`/admin/orders/${order.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Lihat Detail <ChevronRightIcon aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentOrders({ orders }: { orders: AdminOrderSummary[] }) {
  if (orders.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 text-center shadow-none">
        <CardContent className="py-12">
          <ClipboardListIcon className="mx-auto size-10 text-slate-400" />
          <h3 className="mt-3 font-semibold text-slate-900">Belum ada pesanan</h3>
          <p className="mt-1 text-sm text-slate-500">Pesanan pelanggan yang masuk akan muncul di sini.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="hidden border-slate-200 py-0 shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              <tr><th className="px-4 py-3">Pesanan</th><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Layanan</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const item = order.items[0];
                return <tr key={order.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 font-bold text-slate-950">{order.orderNumber}</td>
                  <td className="max-w-44 truncate px-4 py-4 text-slate-700">{order.customerName}</td>
                  <td className="px-4 py-4"><p className="font-medium text-slate-900">{item?.serviceName ?? "Belum tersedia"}</p><p className="mt-1 text-xs text-slate-500">{formatOrderQuantity(item)}</p></td>
                  <td className="px-4 py-4 font-semibold text-slate-900">{formatRupiah(getOrderDisplayTotal(order))}</td>
                  <td className="px-4 py-4"><StatusBadge order={order} /></td>
                  <td className="px-4 py-4 text-slate-600">{formatOrderDate(order.createdAt)}</td>
                  <td className="px-4 py-4 text-right"><Link to={`/admin/orders/${order.id}`} className={buttonVariants({ variant: "outline" })}>Lihat Detail</Link></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {orders.map((order) => <RecentOrderMobile key={order.id} order={order} />)}
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="space-y-8" aria-label="Memuat dashboard"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div><div className="space-y-4"><Skeleton className="h-7 w-44" /><Card className="border-slate-200"><CardContent className="space-y-4">{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</CardContent></Card></div></div>;
}

export function meta() { return [{ title: "Dashboard Admin | A&W Laundry" }]; }

export default function AdminDashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const loadDashboard = useCallback(async () => {
    setState({ status: "loading" });
    try { setState({ status: "ready", data: await getAdminDashboard() }); }
    catch { setState({ status: "error" }); }
  }, []);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  return <div className="space-y-8">
    <PageHeader eyebrow="Operasional admin" title="Dashboard" description="Pantau aktivitas operasional A&W Laundry hari ini." />
    {state.status === "loading" ? <DashboardSkeleton /> : state.status === "error" ? <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center px-5 py-12"><CircleAlertIcon className="size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Dashboard belum dapat dimuat</h2><p className="mt-2 max-w-md text-sm text-slate-600">Terjadi gangguan saat mengambil data operasional. Silakan coba lagi.</p><button type="button" onClick={() => void loadDashboard()} className={cn(buttonVariants({ size: "lg" }), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Pesanan" value={state.data.totalOrders} description="Seluruh pesanan tercatat" icon={ClipboardListIcon} iconClass="bg-blue-50 text-blue-700" />
        <KpiCard label="Pesanan Aktif" value={state.data.activeOrders} description="Masih dalam proses" icon={Clock3Icon} iconClass="bg-amber-50 text-amber-700" />
        <KpiCard label="Pesanan Selesai" value={state.data.completedOrders} description="Status selesai" icon={CheckCircle2Icon} iconClass="bg-emerald-50 text-emerald-700" />
        <KpiCard label="Pelanggan" value={state.data.activeCustomers} description="Akun customer aktif" icon={UsersIcon} iconClass="bg-violet-50 text-violet-700" />
        <KpiCard label="Total Pendapatan" value={formatRupiah(state.data.totalRevenue)} description="Pembayaran yang sudah diterima" icon={BanknoteIcon} iconClass="bg-sky-50 text-sky-700" />
      </div>
      <section className="space-y-4"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">Pesanan Terbaru</h2><p className="mt-1 text-sm text-slate-500">Lima pesanan terbaru yang masuk.</p></div><Link to="/admin/orders" className={buttonVariants({ variant: "outline" })}>Lihat Semua</Link></div><RecentOrders orders={state.data.recentOrders} /></section>
    </>}
  </div>;
}
