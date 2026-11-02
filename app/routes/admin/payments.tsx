import { WalletCards } from "lucide-react";

import { PlaceholderCard } from "~/components/shared/placeholder-card";

export default function AdminPaymentsPage() {
  return (
    <PlaceholderCard
      icon={WalletCards}
      title="Pembayaran"
      description="Status dan pencatatan pembayaran akan dikelola di halaman ini."
      note="Belum ada transaksi pembayaran untuk ditampilkan."
    />
  );
}
