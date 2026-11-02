import { PlusCircleIcon } from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";

export function meta() {
  return [{ title: "Buat Pesanan | A&W Laundry" }];
}

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aplikasi pelanggan"
        title="Buat Pesanan"
        description="Mulai pesanan laundry baru dengan memilih layanan yang Anda butuhkan."
      />
      <PlaceholderCard
        icon={PlusCircleIcon}
        title="Form pesanan akan tersedia di sini"
        description="Alur pemilihan layanan, detail laundry, dan pickup akan ditambahkan pada tahap berikutnya."
        note="Halaman ini belum mengirim atau menyimpan data apa pun."
      />
    </div>
  );
}
