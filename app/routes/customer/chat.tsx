import { MessageCircleIcon } from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";

export function meta() {
  return [{ title: "Chat | A&W Laundry" }];
}

export default function CustomerChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bantuan pelanggan"
        title="A&W Laundry Assistant"
        description="Tempat untuk mendapatkan bantuan dan informasi seputar layanan laundry."
      />
      <PlaceholderCard
        icon={MessageCircleIcon}
        title="Percakapan akan dimulai di sini"
        description="Tampilan chat saat ini masih berupa placeholder dan belum terhubung ke layanan AI."
        note="Tidak ada pesan atau data pelanggan yang dikirim dari halaman ini."
      />
    </div>
  );
}
