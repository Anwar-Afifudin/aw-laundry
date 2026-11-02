import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AuthFormShell } from "~/features/auth/components/auth-form-shell";

export const meta = () => [
  { title: "Lupa Kata Sandi | A&W Laundry" },
  {
    name: "description",
    content: "Atur ulang kata sandi akun A&W Laundry Anda.",
  },
];

export default function ForgotPasswordPage() {
  return (
    <AuthFormShell
      title="Lupa kata sandi?"
      description="Masukkan email akun Anda. Nantinya kami akan mengirimkan petunjuk untuk mengatur ulang kata sandi."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-2 font-semibold text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke halaman masuk
        </Link>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="space-y-2">
          <Label htmlFor="forgot-password-email">
            Email <span className="text-red-600">*</span>
          </Label>
          <Input
            id="forgot-password-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className="h-11"
            required
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full">
          <Mail data-icon="inline-start" aria-hidden="true" />
          Kirim petunjuk
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500">
          Pengiriman email belum aktif karena autentikasi belum dihubungkan.
        </p>
      </form>
    </AuthFormShell>
  );
}
