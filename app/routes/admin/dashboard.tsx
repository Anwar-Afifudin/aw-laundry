import { LayoutDashboard } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminDashboardPage() {
  return (
    <PlaceholderCard
      icon={LayoutDashboard}
      title="Dashboard admin"
      description="Ringkasan operasional A&W Laundry akan ditampilkan di halaman ini."
      note="Data dashboard belum dihubungkan pada tahap routing dan layout."
    />
  );
}
