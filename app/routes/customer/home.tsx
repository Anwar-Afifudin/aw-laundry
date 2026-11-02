import { HouseIcon } from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";

export function meta() {
  return [{ title: "Beranda Pelanggan | A&W Laundry" }];
}

export default function CustomerHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aplikasi pelanggan"
        title="Beranda"
        description="Akses layanan A&W Laundry dari satu tempat yang sederhana dan nyaman."
      />
      <PlaceholderCard
        icon={HouseIcon}
        title="Selamat datang di A&W Laundry"
        description="Ringkasan aktivitas laundry Anda akan tersedia di halaman ini."
        note="Gunakan navigasi untuk melihat pesanan, membuat pesanan baru, membuka chat, atau mengelola profil."
      />
    </div>
  );
}
