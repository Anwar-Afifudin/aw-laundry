import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { AuthFormShell } from "~/features/auth/components/auth-form-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const meta = () => [
  { title: "Masuk | A&W Laundry" },
  { name: "description", content: "Masuk ke akun A&W Laundry Anda." },
];

export default function LoginPage() {
  return (
    <AuthFormShell
      title="Selamat datang kembali"
      description="Masuk untuk melihat dan mengelola kebutuhan laundry Anda."
      footer={
        <p>
          Belum punya akun?{" "}
          <Link
            to="/register"
            className="font-semibold text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="space-y-2">
          <Label htmlFor="login-email">
            Email <span className="text-red-600">*</span>
          </Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="login-password">
              Kata sandi <span className="text-red-600">*</span>
            </Label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            className="h-11"
            required
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full">
          Masuk
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500">
          Form ini masih berupa tampilan dan belum terhubung ke autentikasi.
        </p>
      </form>
    </AuthFormShell>
  );
}
