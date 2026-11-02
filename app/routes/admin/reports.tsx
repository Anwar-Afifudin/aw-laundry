import { ChartNoAxesCombined } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminReportsPage() {
  return (
    <PlaceholderCard
      icon={ChartNoAxesCombined}
      title="Laporan"
      description="Laporan operasional dan bisnis nantinya tersedia di halaman ini."
      note="Belum ada data laporan untuk ditampilkan."
    />
  );
}
