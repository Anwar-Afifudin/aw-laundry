import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  MessageSquareWarningIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  complaintCategoryLabels,
  complaintDateTimeFormatter,
  complaintStatusLabels,
  complaintStatusStyles,
  complaintTimelineLabels,
} from "~/features/complaints/complaint-display";
import { getCustomerComplaintDetail } from "~/features/complaints/queries/get-customer-complaint-detail";
import type { CustomerComplaintDetail } from "~/features/complaints/types";
import { cn } from "~/lib/utils";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; complaint: CustomerComplaintDetail }
  | { status: "not_found" }
  | { status: "error" };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function DetailSkeleton() {
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)]"><div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div><Skeleton className="h-80" /></div>;
}

function ComplaintContent({ complaint }: { complaint: CustomerComplaintDetail }) {
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)]">
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h2 className="break-words text-xl font-bold text-slate-950">{complaint.subject}</h2><Link to={`/app/orders/${complaint.orderId}`} className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">{complaint.orderNumber}</Link><p className="mt-1 text-sm text-slate-500">Dibuat {complaintDateTimeFormatter.format(new Date(complaint.createdAt))}</p></div><Badge variant="outline" className={cn("h-auto self-start py-1 ring-1", complaintStatusStyles[complaint.status])}>{complaintStatusLabels[complaint.status]}</Badge></div></CardContent></Card>
      <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Informasi Komplain</CardTitle></CardHeader><CardContent className="space-y-5"><div><p className="text-xs font-medium text-slate-500">Kategori</p><p className="mt-1 font-medium text-slate-900">{complaintCategoryLabels[complaint.category]}</p></div><div><p className="text-xs font-medium text-slate-500">Deskripsi</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{complaint.description}</p></div></CardContent></Card>
      {complaint.resolutionNotes && <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm"><CardHeader><CardTitle className="text-emerald-900">Penyelesaian dari A&W Laundry</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{complaint.resolutionNotes}</p>{complaint.resolvedAt && <p className="mt-4 text-xs font-medium text-emerald-800">Diselesaikan {complaintDateTimeFormatter.format(new Date(complaint.resolvedAt))}</p>}</CardContent></Card>}
    </div>
    <aside className="lg:sticky lg:top-24 lg:self-start"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Perkembangan Komplain</CardTitle></CardHeader><CardContent>{complaint.statusHistory.length === 0 ? <p className="text-sm text-slate-600">Riwayat status belum tersedia.</p> : <ol>{complaint.statusHistory.map((event, index) => <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">{index < complaint.statusHistory.length - 1 && <span className="absolute top-6 bottom-0 left-2.5 w-px bg-slate-200" />}<span className={cn("relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full ring-4 ring-white", index === complaint.statusHistory.length - 1 ? "bg-blue-600 text-white" : "bg-emerald-600 text-white")}><CheckIcon className="size-3" /></span><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{complaintTimelineLabels[event.toStatus]}</p><p className="mt-1 text-xs text-slate-500">{complaintDateTimeFormatter.format(new Date(event.createdAt))}</p>{event.note && <p className="mt-2 break-words text-xs leading-5 text-slate-600">{event.note}</p>}</div></li>)}</ol>}</CardContent></Card></aside>
  </div>;
}

export function meta() { return [{ title: "Detail Komplain | A&W Laundry" }]; }

export default function CustomerComplaintDetailPage() {
  const { complaintId } = useParams();
  const location = useLocation();
  const created = Boolean((location.state as { complaintCreated?: boolean } | null)?.complaintCreated);
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const load = useCallback(async () => {
    if (!complaintId || !uuidPattern.test(complaintId)) { setState({ status: "not_found" }); return; }
    setState({ status: "loading" });
    try {
      const result = await getCustomerComplaintDetail(complaintId);
      setState(result.status === "found" ? { status: "ready", complaint: result.complaint } : { status: "not_found" });
    } catch { setState({ status: "error" }); }
  }, [complaintId]);
  useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6">
    <Link to="/app/complaints" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}><ArrowLeftIcon /> Kembali ke Komplain Saya</Link>
    <PageHeader eyebrow="Aplikasi pelanggan" title="Detail Komplain" description="Pantau laporan dan tindak lanjut dari tim A&W Laundry." />
    {created && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900"><CheckIcon /><AlertTitle>Komplain berhasil dikirim</AlertTitle><AlertDescription>Tim A&W Laundry akan meninjau laporan Anda.</AlertDescription></Alert>}
    {state.status === "loading" ? <DetailSkeleton /> : state.status === "ready" ? <ComplaintContent complaint={state.complaint} /> : state.status === "not_found" ? <Card className="text-center"><CardContent className="py-12"><MessageSquareWarningIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Komplain tidak ditemukan</h2><p className="mt-2 text-sm text-slate-600">Komplain tidak tersedia atau tidak dapat diakses oleh akun Anda.</p><Link to="/app/complaints" className={cn(buttonVariants(), "mt-5")}>Kembali ke Komplain Saya</Link></CardContent></Card> : <Card className="text-center"><CardContent className="py-12"><CircleAlertIcon className="mx-auto size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Detail komplain belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat memuat detail komplain.</p><button type="button" onClick={() => void load()} className={cn(buttonVariants(), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card>}
  </div>;
}
