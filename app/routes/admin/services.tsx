import { Shirt } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminServicesPage() {
  return (
    <PlaceholderCard
      icon={Shirt}
      title="Layanan"
      description="Jenis layanan, harga, dan durasi pengerjaan akan dikelola di sini."
      note="Pengelolaan layanan belum tersedia pada tahap ini."
    />
  );
}
