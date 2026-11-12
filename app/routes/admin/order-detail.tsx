import { ArrowLeftIcon, ClipboardListIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Detail Pesanan Admin | A&W Laundry" }];
}

export default function AdminOrderDetailPage() {
  const { orderId } = useParams();

  return (
    <div className="space-y-6">
      <Link
        to="/admin/orders"
        className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}
      >
        <ArrowLeftIcon aria-hidden="true" /> Kembali ke Pesanan
      </Link>
      <PageHeader
        eyebrow="Operasional admin"
        title="Detail Pesanan"
        description="Pengelolaan detail dan status pesanan akan tersedia pada tahap berikutnya."
      />
      <Card className="border-slate-200 text-center shadow-sm">
        <CardContent className="flex flex-col items-center px-5 py-10">
          <ClipboardListIcon
            aria-hidden="true"
            className="size-11 text-blue-600"
          />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">
            Detail pesanan belum diimplementasikan
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Pesanan dengan ID {orderId ?? "tidak tersedia"} dipilih. Halaman ini
            sengaja hanya menjadi tujuan navigasi yang aman pada tahap daftar
            pesanan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
