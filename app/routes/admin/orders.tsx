import { ClipboardList } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminOrdersPage() {
  return (
    <PlaceholderCard
      icon={ClipboardList}
      title="Pesanan"
      description="Daftar dan detail pesanan pelanggan nantinya dikelola dari sini."
      note="Belum ada data pesanan untuk ditampilkan."
    />
  );
}
