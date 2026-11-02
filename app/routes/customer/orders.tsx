import { ClipboardListIcon } from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";

export function meta() {
  return [{ title: "Pesanan Saya | A&W Laundry" }];
}

export default function CustomerOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aplikasi pelanggan"
        title="Pesanan Saya"
        description="Lihat pesanan aktif dan riwayat laundry Anda."
      />
      <PlaceholderCard
        icon={ClipboardListIcon}
        title="Belum ada pesanan yang ditampilkan"
        description="Daftar pesanan dan status laundry Anda akan muncul di sini."
        note="Fitur data pesanan akan dihubungkan pada tahap implementasi berikutnya."
      />
    </div>
  );
}
