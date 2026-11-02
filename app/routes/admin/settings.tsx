import { Settings } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminSettingsPage() {
  return (
    <PlaceholderCard
      icon={Settings}
      title="Pengaturan"
      description="Konfigurasi aplikasi dan operasional akan dikelola di halaman ini."
      note="Pengaturan lanjutan belum tersedia pada tahap ini."
    />
  );
}
