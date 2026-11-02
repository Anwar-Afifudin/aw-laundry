import { WashingMachine } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminProductionPage() {
  return (
    <PlaceholderCard
      icon={WashingMachine}
      title="Produksi"
      description="Antrean dan progres proses laundry akan dipantau di halaman ini."
      note="Belum ada antrean produksi untuk ditampilkan."
    />
  );
}
