import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeftIcon, CircleAlertIcon, RefreshCwIcon, SendIcon } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { complaintCategoryLabels, complaintDateFormatter } from "~/features/complaints/complaint-display";
import { CreateCustomerComplaintError, createCustomerComplaint } from "~/features/complaints/mutations/create-customer-complaint";
import { getCustomerComplaintOrders } from "~/features/complaints/queries/get-customer-complaint-orders";
import type { ComplaintCategory, ComplaintOrderOption } from "~/features/complaints/types";
import { orderStatusLabels } from "~/features/orders/order-display";
import { cn } from "~/lib/utils";

type OrdersState = { status: "loading" } | { status: "ready"; orders: ComplaintOrderOption[] } | { status: "error" };
const categories = Object.entries(complaintCategoryLabels) as Array<[ComplaintCategory, string]>;

export function meta() { return [{ title: "Buat Komplain | A&W Laundry" }]; }

export default function NewCustomerComplaintPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedOrderId = searchParams.get("orderId") ?? "";
  const [ordersState, setOrdersState] = useState<OrdersState>({ status: "loading" });
  const [orderId, setOrderId] = useState("");
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setOrdersState({ status: "loading" });
    try {
      const orders = await getCustomerComplaintOrders();
      setOrdersState({ status: "ready", orders });
      if (requestedOrderId && orders.some((order) => order.id === requestedOrderId)) {
        setOrderId((current) => current || requestedOrderId);
      }
    } catch { setOrdersState({ status: "error" }); }
  }, [requestedOrderId]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const selectedOrder = useMemo(() => ordersState.status === "ready" ? ordersState.orders.find((order) => order.id === orderId) : undefined, [orderId, ordersState]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!orderId || !category || !trimmedSubject || !trimmedDescription) { setError("Lengkapi semua kolom wajib sebelum mengirim komplain."); return; }
    if (trimmedSubject.length > 120 || trimmedDescription.length > 3000) { setError("Judul atau deskripsi melebihi batas karakter."); return; }
    setSubmitting(true); setError(null);
    try {
      const complaintId = await createCustomerComplaint({ orderId, category, subject: trimmedSubject, description: trimmedDescription });
      navigate(`/app/complaints/${complaintId}`, { replace: true, state: { complaintCreated: true } });
    } catch (caught) {
      setError(caught instanceof CreateCustomerComplaintError ? caught.message : "Komplain belum berhasil dikirim. Silakan coba lagi.");
      setSubmitting(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <Link to="/app/complaints" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}><ArrowLeftIcon /> Kembali ke Komplain Saya</Link>
    <PageHeader eyebrow="Aplikasi pelanggan" title="Buat Komplain" description="Sampaikan masalah terkait pesanan agar tim A&W Laundry dapat menindaklanjutinya." />
    {ordersState.status === "loading" ? <Skeleton className="h-[34rem]" /> : ordersState.status === "error" ? <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Pesanan belum dapat dimuat</AlertTitle><AlertDescription><p>Coba lagi untuk memuat daftar pesanan Anda.</p><Button type="button" variant="outline" className="mt-4" onClick={() => void loadOrders()}><RefreshCwIcon /> Coba lagi</Button></AlertDescription></Alert> : ordersState.orders.length === 0 ? <Card className="text-center"><CardContent className="py-12"><h2 className="font-semibold">Belum ada pesanan</h2><p className="mt-2 text-sm text-slate-600">Anda memerlukan pesanan untuk membuat komplain.</p><Link to="/app/orders/new" className={cn(buttonVariants(), "mt-5")}>Buat Pesanan</Link></CardContent></Card> : <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Detail Komplain</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="complaint-order">Pesanan</Label><select id="complaint-order" value={orderId} onChange={(event) => setOrderId(event.target.value)} required className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="">Pilih pesanan</option>{ordersState.orders.map((order) => <option key={order.id} value={order.id}>{order.orderNumber} — {complaintDateFormatter.format(new Date(order.createdAt))}</option>)}</select>{selectedOrder && <p className="text-xs text-slate-500">Status pesanan: {orderStatusLabels[selectedOrder.status]}</p>}</div>
      <div className="space-y-2"><Label htmlFor="complaint-category">Kategori</Label><select id="complaint-category" value={category} onChange={(event) => setCategory(event.target.value as ComplaintCategory | "")} required className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="">Pilih kategori</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="complaint-subject">Judul komplain</Label><Input id="complaint-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} required /><p className="text-right text-xs text-slate-500">{subject.length}/120</p></div>
      <div className="space-y-2"><Label htmlFor="complaint-description">Jelaskan masalah</Label><Textarea id="complaint-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} rows={7} required /><p className="text-right text-xs text-slate-500">{description.length}/3000</p></div>
      {error && <Alert variant="destructive"><CircleAlertIcon /><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto"><SendIcon /> {submitting ? "Mengirim..." : "Kirim Komplain"}</Button>
    </form></CardContent></Card>}
  </div>;
}
