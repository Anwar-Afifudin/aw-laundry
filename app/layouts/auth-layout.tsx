import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Outlet } from "react-router";

import { BrandLogo } from "~/components/shared/brand-logo";
import { GuestGuard } from "~/features/auth/components/guest-guard";

const benefits = [
  {
    icon: CheckCircle2,
    title: "Pesanan lebih praktis",
    description: "Buat dan pantau pesanan laundry dari satu tempat.",
  },
  {
    icon: ShieldCheck,
    title: "Proses lebih transparan",
    description: "Ketahui perkembangan laundry Anda dengan lebih mudah.",
  },
  {
    icon: Sparkles,
    title: "Layanan yang terasa ringan",
    description: "Pengalaman modern untuk rutinitas laundry sehari-hari.",
  },
] as const;

export default function AuthLayout() {
  return (
    <main className="grid min-h-svh bg-slate-50 lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-blue-600 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-16">
        <div
          aria-hidden="true"
          className="absolute -left-24 top-1/3 size-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 size-80 rounded-full bg-blue-400/30 blur-3xl"
        />

        <BrandLogo
          to="/"
          className="relative z-10 bg-white p-2.5 pr-4 shadow-sm"
        />

        <div className="relative z-10 max-w-xl space-y-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
              Laundry jadi lebih mudah
            </p>
            <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Bersih, rapi, dan selalu dalam pantauan Anda.
            </h1>
            <p className="max-w-lg text-base leading-7 text-blue-100 xl:text-lg">
              Kelola kebutuhan laundry dengan pengalaman digital yang praktis,
              jelas, dan nyaman.
            </p>
          </div>

          <ul className="grid gap-5" aria-label="Keunggulan A&W Laundry">
            {benefits.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm leading-6 text-blue-100">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-blue-100">
          &copy; {new Date().getFullYear()} A&amp;W Laundry
        </p>
      </section>

      <section className="flex min-h-svh flex-col px-4 py-6 sm:px-8 sm:py-8 lg:px-12 xl:px-20">
        <div className="mx-auto flex w-full max-w-md items-center justify-between lg:hidden">
          <BrandLogo to="/" />
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Laundry modern
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10 sm:py-14">
          <GuestGuard>
            <Outlet />
          </GuestGuard>
        </div>

        <p className="mx-auto w-full max-w-md text-center text-xs leading-5 text-slate-500 lg:text-left">
          Dengan melanjutkan, Anda menyetujui ketentuan layanan dan kebijakan
          privasi A&amp;W Laundry.
        </p>
      </section>
    </main>
  );
}
