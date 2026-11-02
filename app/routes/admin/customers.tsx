import { Users } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminCustomersPage() {
  return (
    <PlaceholderCard
      icon={Users}
      title="Pelanggan"
      description="Profil dan riwayat pelanggan nantinya dapat dilihat dari halaman ini."
      note="Belum ada data pelanggan untuk ditampilkan."
    />
  );
}
