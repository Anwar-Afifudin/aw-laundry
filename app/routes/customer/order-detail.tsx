import { ArrowLeftIcon, ClipboardListIcon } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Detail Pesanan | A&W Laundry" }];
}

export default function CustomerOrderDetailPage() {
  return (
    <div className="space-y-6">
      <Link to="/app/orders" className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}>
        <ArrowLeftIcon aria-hidden="true" /> Kembali ke Pesanan Saya
      </Link>
      <PageHeader
        eyebrow="Aplikasi pelanggan"
        title="Detail Pesanan"
        description="Informasi lengkap pesanan akan tersedia di halaman ini."
      />
      <PlaceholderCard
        icon={ClipboardListIcon}
        title="Detail pesanan sedang disiapkan"
        description="Untuk saat ini, ringkasan dan status pesanan dapat dilihat di halaman Pesanan Saya."
        note="Halaman ini tidak memuat atau mengubah data pesanan."
      />
    </div>
  );
}
