import {
  ArrowRight,
  LayoutDashboard,
  LogIn,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router";

import { BrandLogo } from "~/components/shared/brand-logo";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

const entryLinks = [
  {
    to: "/app",
    label: "Aplikasi Pelanggan",
    description: "Lihat shell aplikasi dan navigasi pelanggan.",
    icon: Smartphone,
  },
  {
    to: "/admin",
    label: "Dashboard Admin",
    description: "Buka area operasional dan navigasi admin.",
    icon: LayoutDashboard,
  },
  {
    to: "/login",
    label: "Halaman Login",
    description: "Tinjau tampilan autentikasi sementara.",
    icon: LogIn,
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo to="/" />
          <Badge variant="secondary">Development entry</Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Routing shell
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Selamat datang di A&amp;W Laundry
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Pilih area aplikasi untuk meninjau layout dan navigasi sementara
            sebelum autentikasi diterapkan.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {entryLinks.map(({ to, label, description, icon: Icon }) => (
            <Card key={to} className="shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h2 className="mt-5 font-heading text-base font-semibold text-foreground">
                  {label}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "mt-6 w-full justify-between",
                  )}
                  to={to}
                >
                  Buka area
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
