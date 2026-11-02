import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AuthFormShell } from "~/features/auth/components/auth-form-shell";

export const meta = () => [
  { title: "Daftar | A&W Laundry" },
  { name: "description", content: "Buat akun pelanggan A&W Laundry." },
];

export default function RegisterPage() {
  return (
    <AuthFormShell
      title="Buat akun pelanggan"
      description="Daftar untuk mulai membuat dan memantau pesanan laundry Anda."
      footer={
        <p>
          Sudah punya akun?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
          >
            Masuk
          </Link>
        </p>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="space-y-2">
          <Label htmlFor="register-name">
            Nama lengkap <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-name"
            name="fullName"
            autoComplete="name"
            placeholder="Nama lengkap Anda"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">
            Email <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-phone">
            Nomor telepon <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">
            Kata sandi <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            className="h-11"
            minLength={8}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password-confirmation">
            Konfirmasi kata sandi <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            placeholder="Ulangi kata sandi"
            className="h-11"
            minLength={8}
            required
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full">
          Buat akun
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500">
          Form ini masih berupa tampilan dan belum terhubung ke autentikasi.
        </p>
      </form>
    </AuthFormShell>
  );
}
