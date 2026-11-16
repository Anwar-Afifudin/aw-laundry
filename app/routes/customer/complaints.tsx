import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRightIcon,
  MessageSquareWarningIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  complaintCategoryLabels,
  complaintDateFormatter,
  complaintStatusLabels,
  complaintStatusStyles,
} from "~/features/complaints/complaint-display";
import { getCustomerComplaints } from "~/features/complaints/queries/get-customer-complaints";
import type {
  ComplaintStatus,
  CustomerComplaint,
} from "~/features/complaints/types";
import { cn } from "~/lib/utils";

type ComplaintsState =
  | { status: "loading" }
  | { status: "ready"; complaints: CustomerComplaint[] }
  | { status: "error" };
type ComplaintFilter = "all" | "open" | "in_progress" | "finished";

const filters: Array<{ value: ComplaintFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "open", label: "Terbuka" },
  { value: "in_progress", label: "Diproses" },
  { value: "finished", label: "Selesai" },
];

function SummaryCards({ complaints }: { complaints: CustomerComplaint[] }) {
  const summaries = [
    ["Total", complaints.length],
    ["Terbuka", complaints.filter((item) => item.status === "OPEN").length],
    ["Diproses", complaints.filter((item) => item.status === "IN_PROGRESS").length],
    ["Selesai", complaints.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length],
  ] as const;

  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{summaries.map(([label, value]) => (
    <Card key={label} className="border-slate-200 py-0 shadow-sm"><CardContent className="p-4 sm:p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></CardContent></Card>
  ))}</div>;
}

function ComplaintCard({ complaint }: { complaint: CustomerComplaint }) {
  return <Card className="border-slate-200 py-0 shadow-sm"><CardContent className="p-0">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
      <div className="min-w-0"><h2 className="break-words font-semibold text-slate-950">{complaint.subject}</h2><p className="mt-1 text-sm font-medium text-blue-700">{complaint.orderNumber}</p></div>
      <Badge variant="outline" className={cn("h-auto self-start py-1 ring-1", complaintStatusStyles[complaint.status])}>{complaintStatusLabels[complaint.status]}</Badge>
    </div>
    <div className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-2 sm:px-5">
      <div><p className="text-xs font-medium text-slate-500">Kategori</p><p className="mt-1 text-slate-800">{complaintCategoryLabels[complaint.category]}</p></div>
      <div><p className="text-xs font-medium text-slate-500">Dibuat</p><p className="mt-1 text-slate-800">{complaintDateFormatter.format(new Date(complaint.createdAt))}</p></div>
    </div>
    <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5"><Link to={`/app/complaints/${complaint.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>Lihat Detail <ChevronRightIcon aria-hidden="true" /></Link></div>
  </CardContent></Card>;
}

function ComplaintsSkeleton() {
  return <div aria-label="Memuat komplain" className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}</div>{[0, 1].map((item) => <Skeleton key={item} className="h-52" />)}</div>;
}

export function meta() { return [{ title: "Komplain Saya | A&W Laundry" }]; }

export default function CustomerComplaintsPage() {
  const [state, setState] = useState<ComplaintsState>({ status: "loading" });
  const [filter, setFilter] = useState<ComplaintFilter>("all");
  const load = useCallback(async () => {
    setState({ status: "loading" });
    try { setState({ status: "ready", complaints: await getCustomerComplaints() }); }
    catch { setState({ status: "error" }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    if (state.status !== "ready" || filter === "all") return state.status === "ready" ? state.complaints : [];
    const statuses: Record<Exclude<ComplaintFilter, "all">, ComplaintStatus[]> = {
      open: ["OPEN"], in_progress: ["IN_PROGRESS"], finished: ["RESOLVED", "CLOSED"],
    };
    return state.complaints.filter((item) => statuses[filter].includes(item.status));
  }, [filter, state]);

  return <div className="space-y-6">
    <PageHeader eyebrow="Aplikasi pelanggan" title="Komplain Saya" description="Pantau laporan dan tindak lanjut komplain pesanan Anda." actions={<Link to="/app/complaints/new" className={buttonVariants({ size: "lg" })}><PlusIcon aria-hidden="true" /> Buat Komplain</Link>} />
    {state.status === "loading" ? <ComplaintsSkeleton /> : state.status === "error" ? (
      <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center py-10"><RefreshCwIcon className="size-10 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Komplain belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat memuat komplain Anda.</p><button type="button" onClick={() => void load()} className={cn(buttonVariants({ size: "lg" }), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card>
    ) : state.complaints.length === 0 ? (
      <Card className="border-slate-200 text-center shadow-sm"><CardContent className="flex flex-col items-center py-12"><span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-700"><MessageSquareWarningIcon className="size-7" /></span><h2 className="mt-4 text-lg font-semibold">Belum ada komplain</h2><p className="mt-2 text-sm text-slate-600">Komplain yang Anda buat akan muncul di sini.</p><Link to="/app/complaints/new" className={cn(buttonVariants({ size: "lg" }), "mt-5")}>Buat Komplain</Link></CardContent></Card>
    ) : <><SummaryCards complaints={state.complaints} /><div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={cn("min-h-10 shrink-0 rounded-lg px-4 text-sm font-semibold", filter === item.value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100")}>{item.label}</button>)}</div>{visible.length ? <div className="space-y-4">{visible.map((item) => <ComplaintCard key={item.id} complaint={item} />)}</div> : <Card className="border-dashed text-center shadow-none"><CardContent className="py-10"><MessageSquareWarningIcon className="mx-auto size-9 text-slate-400" /><p className="mt-3 font-semibold">Tidak ada komplain pada filter ini</p></CardContent></Card>}</>}
  </div>;
}
