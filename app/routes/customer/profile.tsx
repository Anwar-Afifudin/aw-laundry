import { UserRoundIcon } from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";

export function meta() {
  return [{ title: "Profil | A&W Laundry" }];
}

export default function CustomerProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Akun pelanggan"
        title="Profil"
        description="Kelola informasi pribadi dan preferensi akun A&W Laundry Anda."
      />
      <PlaceholderCard
        icon={UserRoundIcon}
        title="Informasi profil akan tampil di sini"
        description="Detail akun, nomor telepon, dan alamat akan tersedia setelah autentikasi diterapkan."
        note="Halaman ini belum memuat atau menyimpan data pribadi."
      />
    </div>
  );
}
