import { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon, CheckIcon, CircleAlertIcon, LockIcon, MessageSquareWarningIcon, PhoneIcon, RefreshCwIcon, UserIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { complaintCategoryLabels, complaintDateTimeFormatter, complaintStatusLabels, complaintStatusStyles, complaintTimelineLabels } from "~/features/complaints/complaint-display";
import { UpdateAdminComplaintStatusError, updateAdminComplaintStatus } from "~/features/complaints/mutations/update-admin-complaint-status";
import { getAdminComplaintDetail } from "~/features/complaints/queries/get-admin-complaint-detail";
import type { AdminComplaintDetail, ComplaintStatus } from "~/features/complaints/types";
import { cn } from "~/lib/utils";

type State = { status: "loading" } | { status: "ready"; complaint: AdminComplaintDetail } | { status: "not_found" } | { status: "error" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function StatusActions({ complaint, onUpdated }: { complaint: AdminComplaintDetail; onUpdated: () => Promise<void> }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const next: Partial<Record<ComplaintStatus, ComplaintStatus>> = { OPEN: "IN_PROGRESS", IN_PROGRESS: "RESOLVED", RESOLVED: "CLOSED" };
  const target = next[complaint.status];
  const labels: Partial<Record<ComplaintStatus, string>> = { OPEN: "Mulai Tangani", IN_PROGRESS: "Tandai Terselesaikan", RESOLVED: "Tutup Komplain" };

  async function update() {
    if (!target) return;
    const trimmedNote = note.trim();
    if (complaint.status === "IN_PROGRESS" && !trimmedNote) { setSuccess(null); setError("Catatan penyelesaian wajib diisi."); return; }
    if (trimmedNote.length > 3000) { setSuccess(null); setError("Catatan tidak boleh lebih dari 3000 karakter."); return; }
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      await updateAdminComplaintStatus(complaint.id, target, trimmedNote || null);
      setNote("");
      setSuccess("Status komplain berhasil diperbarui.");
      await onUpdated();
    } catch (caught) {
      setSuccess(null);
      setError(caught instanceof UpdateAdminComplaintStatusError ? caught.message : "Status komplain belum dapat diperbarui.");
    } finally { setSubmitting(false); }
  }

  if (complaint.status === "CLOSED") return <div className="space-y-4">{success && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900"><CheckIcon /><AlertDescription>{success}</AlertDescription></Alert>}<Alert><LockIcon /><AlertTitle>Komplain telah ditutup</AlertTitle><AlertDescription>Tidak ada perubahan status berikutnya untuk komplain ini.</AlertDescription></Alert></div>;
  return <div className="space-y-4"><div className="space-y-2"><Label htmlFor="status-note">{complaint.status === "IN_PROGRESS" ? "Catatan penyelesaian" : complaint.status === "RESOLVED" ? "Catatan penutupan (opsional)" : "Catatan penanganan (opsional)"}</Label><Textarea id="status-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={3000} rows={5} required={complaint.status === "IN_PROGRESS"} disabled={submitting} /><p className="text-right text-xs text-slate-500">{note.length}/3000</p></div>{error && <Alert variant="destructive"><CircleAlertIcon /><AlertDescription>{error}</AlertDescription></Alert>}{success && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900"><CheckIcon /><AlertDescription>{success}</AlertDescription></Alert>}<Button className="w-full" disabled={submitting} onClick={() => void update()}>{submitting ? "Memperbarui..." : labels[complaint.status]}</Button></div>;
}

function Detail({ complaint, onUpdated }: { complaint: AdminComplaintDetail; onUpdated: () => Promise<void> }) {
  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-6">
    <Card className="border-slate-200 shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><h2 className="break-words text-xl font-bold">{complaint.subject}</h2><Link to={`/admin/orders/${complaint.orderId}`} className="mt-2 inline-block font-semibold text-blue-700 hover:underline">{complaint.orderNumber}</Link><p className="mt-1 text-sm text-slate-500">Dibuat {complaintDateTimeFormatter.format(new Date(complaint.createdAt))}</p></div><Badge variant="outline" className={cn("h-auto self-start py-1 ring-1", complaintStatusStyles[complaint.status])}>{complaintStatusLabels[complaint.status]}</Badge></div></CardContent></Card>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Informasi Pelanggan</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div><p className="flex items-center gap-2 font-semibold"><UserIcon className="size-4 text-blue-600" />{complaint.customerName}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><PhoneIcon className="size-4" />{complaint.customerPhone ?? "Nomor HP tidak tersedia"}</p></div><div className="flex items-center sm:justify-end"><Link to={`/admin/customers/${complaint.customerId}`} className={buttonVariants({ variant: "outline" })}>Lihat Pelanggan</Link></div></CardContent></Card>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Informasi Komplain</CardTitle></CardHeader><CardContent className="space-y-5"><div><p className="text-xs text-slate-500">Kategori</p><p className="mt-1 font-medium">{complaintCategoryLabels[complaint.category]}</p></div><div><p className="text-xs text-slate-500">Deskripsi pelanggan</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{complaint.description}</p></div></CardContent></Card>
    {complaint.resolutionNotes && <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm"><CardHeader><CardTitle className="text-emerald-900">Penyelesaian</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap break-words text-sm leading-6">{complaint.resolutionNotes}</p>{complaint.resolvedAt && <p className="mt-3 text-xs text-emerald-800">Diselesaikan {complaintDateTimeFormatter.format(new Date(complaint.resolvedAt))}</p>}{complaint.closedAt && <p className="mt-1 text-xs text-slate-600">Ditutup {complaintDateTimeFormatter.format(new Date(complaint.closedAt))}</p>}</CardContent></Card>}
  </div><aside className="space-y-6 lg:sticky lg:top-24"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Kelola Status</CardTitle></CardHeader><CardContent><StatusActions complaint={complaint} onUpdated={onUpdated} /></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent>{complaint.statusHistory.length === 0 ? <p className="text-sm text-slate-500">Riwayat status belum tersedia.</p> : <ol>{complaint.statusHistory.map((event, index) => <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">{index < complaint.statusHistory.length - 1 && <span className="absolute top-5 bottom-0 left-2.5 w-px bg-slate-200" />}<span className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white ring-4 ring-white"><CheckIcon className="size-3" /></span><div><p className="text-sm font-semibold">{complaintTimelineLabels[event.toStatus]}</p><p className="mt-1 text-xs text-slate-500">{complaintDateTimeFormatter.format(new Date(event.createdAt))}</p>{event.note && <p className="mt-2 break-words text-xs leading-5 text-slate-600">{event.note}</p>}</div></li>)}</ol>}</CardContent></Card></aside></div>;
}

function Loading() { return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-5"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div><Skeleton className="h-96" /></div>; }
export function meta() { return [{ title: "Detail Komplain Admin | A&W Laundry" }]; }

export default function AdminComplaintDetailPage() {
  const { complaintId } = useParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const load = useCallback(async (showLoading = true) => { if (!complaintId || !uuidPattern.test(complaintId)) { setState({ status: "not_found" }); return; } if (showLoading) setState({ status: "loading" }); try { const result = await getAdminComplaintDetail(complaintId); setState(result.status === "found" ? { status: "ready", complaint: result.complaint } : { status: "not_found" }); } catch { setState({ status: "error" }); } }, [complaintId]);
  useEffect(() => { void load(); }, [load]);
  return <div className="space-y-6"><Link to="/admin/complaints" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}><ArrowLeftIcon /> Kembali ke Komplain</Link><PageHeader eyebrow="Layanan pelanggan" title="Detail Komplain" description="Tinjau laporan pelanggan dan kelola tindak lanjut penyelesaiannya." />{state.status === "loading" ? <Loading /> : state.status === "ready" ? <Detail complaint={state.complaint} onUpdated={() => load(false)} /> : state.status === "not_found" ? <Card className="text-center"><CardContent className="py-12"><MessageSquareWarningIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Komplain tidak ditemukan</h2><p className="mt-2 text-sm text-slate-600">Komplain tidak tersedia atau tidak dapat diakses.</p></CardContent></Card> : <Card className="text-center"><CardContent className="py-12"><CircleAlertIcon className="mx-auto size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Detail komplain belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat mengambil detail komplain.</p><button type="button" onClick={() => void load()} className={cn(buttonVariants(), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card>}</div>;
}
