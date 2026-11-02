import { MessageSquareWarning } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminComplaintsPage() {
  return (
    <PlaceholderCard
      icon={MessageSquareWarning}
      title="Komplain"
      description="Komplain pelanggan dan tindak lanjutnya akan dikelola di sini."
      note="Belum ada komplain untuk ditampilkan."
    />
  );
}
