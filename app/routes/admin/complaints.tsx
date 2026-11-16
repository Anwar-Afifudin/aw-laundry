import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRightIcon, CircleAlertIcon, MessageSquareWarningIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { complaintCategoryLabels, complaintDateFormatter, complaintStatusLabels, complaintStatusStyles } from "~/features/complaints/complaint-display";
import { getAdminComplaints } from "~/features/complaints/queries/get-admin-complaints";
import type { AdminComplaint, ComplaintStatus } from "~/features/complaints/types";
import { cn } from "~/lib/utils";

type State = { status: "loading" } | { status: "ready"; complaints: AdminComplaint[] } | { status: "error" };
type Filter = "ALL" | ComplaintStatus;
const filters: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Semua" }, { value: "OPEN", label: "Terbuka" },
  { value: "IN_PROGRESS", label: "Diproses" }, { value: "RESOLVED", label: "Terselesaikan" },
  { value: "CLOSED", label: "Ditutup" },
];

function Summary({ complaints }: { complaints: AdminComplaint[] }) {
  const items = [
    ["Total", complaints.length], ["Terbuka", complaints.filter((item) => item.status === "OPEN").length],
    ["Diproses", complaints.filter((item) => item.status === "IN_PROGRESS").length],
    ["Selesai", complaints.filter((item) => item.status === "RESOLVED" || item.status === "CLOSED").length],
  ] as const;
  return <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{items.map(([label, value]) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></CardContent></Card>)}</div>;
}

function ComplaintCard({ complaint }: { complaint: AdminComplaint }) {
  return <Card className="border-slate-200 py-0 shadow-sm"><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"><div className="min-w-0"><h2 className="break-words font-semibold text-slate-950">{complaint.subject}</h2><p className="mt-1 text-sm font-medium text-blue-700">{complaint.orderNumber}</p><p className="mt-1 text-sm text-slate-600">{complaint.customerName}</p></div><Badge variant="outline" className={cn("h-auto self-start py-1 ring-1", complaintStatusStyles[complaint.status])}>{complaintStatusLabels[complaint.status]}</Badge></div><dl className="grid gap-4 p-4 text-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-3"><div><dt className="text-xs text-slate-500">Kategori</dt><dd className="mt-1 font-medium">{complaintCategoryLabels[complaint.category]}</dd></div><div><dt className="text-xs text-slate-500">Tanggal dibuat</dt><dd className="mt-1">{complaintDateFormatter.format(new Date(complaint.createdAt))}</dd></div><div className="sm:col-span-2 lg:col-span-1 lg:text-right"><Link to={`/admin/complaints/${complaint.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>Lihat Detail <ChevronRightIcon /></Link></div></dl></CardContent></Card>;
}

function Loading() { return <div className="space-y-5"><div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28" />)}</div><Skeleton className="h-24" />{[0, 1].map((item) => <Skeleton key={item} className="h-52" />)}</div>; }

export function meta() { return [{ title: "Komplain Admin | A&W Laundry" }]; }

export default function AdminComplaintsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const load = useCallback(async () => { setState({ status: "loading" }); try { setState({ status: "ready", complaints: await getAdminComplaints() }); } catch { setState({ status: "error" }); } }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => {
    if (state.status !== "ready") return [];
    const query = search.trim().toLocaleLowerCase("id-ID");
    return state.complaints.filter((item) => (filter === "ALL" || item.status === filter) && (!query || [item.subject, item.orderNumber, item.customerName].some((value) => value.toLocaleLowerCase("id-ID").includes(query))));
  }, [filter, search, state]);
  return <div className="space-y-6"><PageHeader eyebrow="Layanan pelanggan" title="Komplain" description="Kelola laporan pelanggan dan tindak lanjut penyelesaiannya." />{state.status === "loading" ? <Loading /> : state.status === "error" ? <Card className="text-center"><CardContent className="py-12"><CircleAlertIcon className="mx-auto size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Komplain belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat mengambil data komplain.</p><button type="button" onClick={() => void load()} className={cn(buttonVariants(), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card> : <><Summary complaints={state.complaints} />{state.complaints.length === 0 ? <Card className="text-center"><CardContent className="py-12"><MessageSquareWarningIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Belum ada komplain</h2><p className="mt-2 text-sm text-slate-600">Komplain pelanggan akan muncul di sini setelah dibuat.</p></CardContent></Card> : <><div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={cn("min-h-9 shrink-0 rounded-lg px-3 text-sm font-semibold", filter === item.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:text-slate-950")}>{item.label}</button>)}</div><div className="relative max-w-md"><SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul, nomor pesanan, atau pelanggan..." className="pl-9" /></div></div>{visible.length ? <div className="space-y-4">{visible.map((item) => <ComplaintCard key={item.id} complaint={item} />)}</div> : <Card className="border-dashed text-center shadow-none"><CardContent className="py-12"><SearchIcon className="mx-auto size-10 text-slate-400" /><p className="mt-3 font-semibold">Komplain tidak ditemukan</p><p className="mt-1 text-sm text-slate-500">Ubah filter atau kata pencarian.</p></CardContent></Card>}</>}</>}</div>;
}
