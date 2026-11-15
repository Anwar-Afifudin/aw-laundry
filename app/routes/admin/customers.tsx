import { useCallback, useEffect, useMemo, useState } from "react";
import { BanknoteIcon, ChevronRightIcon, CircleAlertIcon, RefreshCwIcon, SearchIcon, ShoppingBagIcon, UserCheckIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { getAdminCustomers } from "~/features/customers/queries/get-admin-customers";
import type { AdminCustomerSummary, AdminCustomersData } from "~/features/customers/types";
import { formatRupiah } from "~/features/orders/order-display";
import { cn } from "~/lib/utils";

type CustomersState = { status: "loading" } | { status: "ready"; data: AdminCustomersData } | { status: "error" };
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const formatDate = (value: string | null) => value ? dateFormatter.format(new Date(value)) : "Belum ada";

function SummaryCards({ data }: { data: AdminCustomersData }) {
  const items = [
    { label: "Total Pelanggan", value: String(data.totalCustomers), icon: UsersIcon, style: "bg-blue-50 text-blue-700" },
    { label: "Pelanggan Aktif", value: String(data.activeCustomers), icon: UserCheckIcon, style: "bg-emerald-50 text-emerald-700" },
    { label: "Total Pesanan", value: String(data.totalOrders), icon: ShoppingBagIcon, style: "bg-amber-50 text-amber-700" },
    { label: "Total Nilai Transaksi", value: formatRupiah(data.paidTransactionTotal), icon: BanknoteIcon, style: "bg-violet-50 text-violet-700" },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(({ label, value, icon: Icon, style }) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 truncate text-2xl font-bold text-slate-950">{value}</p></div><span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", style)}><Icon className="size-5" /></span></CardContent></Card>)}</div>;
}

function MobileCustomerCard({ customer }: { customer: AdminCustomerSummary }) {
  return <Card className="border-slate-200 py-0 shadow-sm md:hidden"><CardContent className="p-0"><div className="border-b border-slate-100 p-4"><p className="font-bold text-slate-950">{customer.fullName}</p><p className="mt-1 text-sm text-slate-600">{customer.email ?? "Email tidak tersedia"}</p><p className="mt-1 text-sm text-slate-600">{customer.phone ?? "Nomor HP tidak tersedia"}</p></div><dl className="grid grid-cols-2 gap-4 p-4 text-sm"><div><dt className="text-xs text-slate-500">Jumlah pesanan</dt><dd className="mt-1 font-semibold">{customer.orderCount}</dd></div><div><dt className="text-xs text-slate-500">Total transaksi</dt><dd className="mt-1 font-semibold">{formatRupiah(customer.paidTransactionTotal)}</dd></div><div><dt className="text-xs text-slate-500">Pesanan terakhir</dt><dd className="mt-1">{formatDate(customer.lastOrderAt)}</dd></div><div><dt className="text-xs text-slate-500">Bergabung</dt><dd className="mt-1">{formatDate(customer.joinedAt)}</dd></div></dl><div className="border-t border-slate-100 bg-slate-50/70 p-3"><Link to={`/admin/customers/${customer.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>Lihat Detail <ChevronRightIcon /></Link></div></CardContent></Card>;
}

function CustomersTable({ customers }: { customers: AdminCustomerSummary[] }) {
  return <Card className="hidden border-slate-200 py-0 shadow-sm md:block"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase"><tr><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Kontak</th><th className="px-4 py-3">Pesanan</th><th className="px-4 py-3">Total transaksi</th><th className="px-4 py-3">Pesanan terakhir</th><th className="px-4 py-3">Bergabung</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.map((customer) => <tr key={customer.id} className="hover:bg-slate-50/60"><td className="px-4 py-4 font-semibold text-slate-950">{customer.fullName}</td><td className="px-4 py-4 text-slate-600"><p>{customer.email ?? "Email tidak tersedia"}</p><p className="mt-1">{customer.phone ?? "Nomor HP tidak tersedia"}</p></td><td className="px-4 py-4 font-medium">{customer.orderCount}</td><td className="px-4 py-4 font-semibold">{formatRupiah(customer.paidTransactionTotal)}</td><td className="px-4 py-4 text-slate-600">{formatDate(customer.lastOrderAt)}</td><td className="px-4 py-4 text-slate-600">{formatDate(customer.joinedAt)}</td><td className="px-4 py-4 text-right"><Link to={`/admin/customers/${customer.id}`} className={buttonVariants({ variant: "outline" })}>Lihat Detail</Link></td></tr>)}</tbody></table></div></Card>;
}

function CustomersSkeleton() { return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>; }
export function meta() { return [{ title: "Pelanggan Admin | A&W Laundry" }]; }

export default function AdminCustomersPage() {
  const [state, setState] = useState<CustomersState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const load = useCallback(async () => { setState({ status: "loading" }); try { setState({ status: "ready", data: await getAdminCustomers() }); } catch { setState({ status: "error" }); } }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => { if (state.status !== "ready") return []; const query = search.trim().toLocaleLowerCase("id-ID"); if (!query) return state.data.customers; return state.data.customers.filter((customer) => [customer.fullName, customer.phone].some((value) => value?.toLocaleLowerCase("id-ID").includes(query))); }, [search, state]);
  return <div className="space-y-6"><PageHeader eyebrow="Relasi pelanggan" title="Pelanggan" description="Lihat profil, aktivitas pesanan, dan nilai transaksi pelanggan." />{state.status === "loading" ? <CustomersSkeleton /> : state.status === "error" ? <Card className="border-slate-200 text-center shadow-sm"><CardContent className="py-12"><CircleAlertIcon className="mx-auto size-11 text-rose-500" /><h2 className="mt-4 text-lg font-semibold">Pelanggan belum dapat dimuat</h2><p className="mt-2 text-sm text-slate-600">Terjadi gangguan saat mengambil data pelanggan.</p><button type="button" onClick={() => void load()} className={cn(buttonVariants(), "mt-5")}><RefreshCwIcon /> Coba lagi</button></CardContent></Card> : <><SummaryCards data={state.data} />{state.data.customers.length === 0 ? <Card className="border-slate-200 text-center shadow-sm"><CardContent className="py-12"><UsersIcon className="mx-auto size-11 text-slate-400" /><h2 className="mt-4 text-lg font-semibold">Belum ada pelanggan</h2><p className="mt-2 text-sm text-slate-600">Akun pelanggan akan muncul di sini setelah terdaftar.</p></CardContent></Card> : <><div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="relative max-w-md"><SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau nomor HP..." aria-label="Cari pelanggan berdasarkan nama atau nomor HP" className="h-10 pl-9" /></div></div>{filtered.length === 0 ? <Card className="border-dashed border-slate-300 text-center shadow-none"><CardContent className="py-12"><SearchIcon className="mx-auto size-10 text-slate-400" /><p className="mt-3 font-semibold">Pelanggan tidak ditemukan</p><p className="mt-1 text-sm text-slate-500">Coba gunakan kata pencarian lain.</p></CardContent></Card> : <div className="space-y-4"><CustomersTable customers={filtered} />{filtered.map((customer) => <MobileCustomerCard key={customer.id} customer={customer} />)}</div>}</>}</>}</div>;
}
