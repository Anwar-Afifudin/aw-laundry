import { useState } from "react";
import {
  Bell,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Menu,
  MessageSquareWarning,
  Search,
  Settings,
  Shirt,
  Users,
  WalletCards,
  WashingMachine,
  X,
  type LucideIcon,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";

import { BrandLogo } from "~/components/shared/brand-logo";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { AuthorizationGuard } from "~/features/auth/components/authorization-guard";
import { cn } from "~/lib/utils";

type AdminNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    label: "Dashboard",
    to: "/admin",
    icon: LayoutDashboard,
    end: true,
  },
  { label: "Pesanan", to: "/admin/orders", icon: ClipboardList },
  { label: "Produksi", to: "/admin/production", icon: WashingMachine },
  { label: "Pelanggan", to: "/admin/customers", icon: Users },
  { label: "Pembayaran", to: "/admin/payments", icon: WalletCards },
  {
    label: "Komplain",
    to: "/admin/complaints",
    icon: MessageSquareWarning,
  },
  {
    label: "Laporan",
    to: "/admin/reports",
    icon: ChartNoAxesCombined,
  },
  { label: "Layanan", to: "/admin/services", icon: Shirt },
  { label: "Pengaturan", to: "/admin/settings", icon: Settings },
];

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/orders": "Pesanan",
  "/admin/production": "Produksi",
  "/admin/customers": "Pelanggan",
  "/admin/payments": "Pembayaran",
  "/admin/complaints": "Komplain",
  "/admin/reports": "Laporan",
  "/admin/services": "Layanan",
  "/admin/settings": "Pengaturan",
};

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
        <BrandLogo to="/admin" />
        {onNavigate ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tutup menu navigasi"
            onClick={onNavigate}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <nav
        aria-label="Navigasi admin"
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon aria-hidden="true" className="size-4.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 border-t p-4">
        <div className="rounded-xl bg-muted/70 px-3 py-3">
          <p className="text-xs font-semibold text-foreground">Area Admin</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Kelola operasional laundry dari satu tempat.
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminProfile() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
      >
        AD
      </div>
      <div className="hidden min-w-0 xl:block">
        <p className="truncate text-sm font-semibold text-foreground">
          Admin Laundry
        </p>
        <p className="truncate text-xs text-muted-foreground">Administrator</p>
      </div>
    </div>
  );
}

function AdminApplicationLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const pageTitle = ADMIN_PAGE_TITLES[normalizedPath] ?? "Admin";

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:block">
        <AdminSidebar />
      </aside>

      <Dialog open={isNavigationOpen} onOpenChange={setIsNavigationOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-y-0 left-0 top-0 h-svh w-[min(20rem,88vw)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-r p-0 sm:max-w-xs lg:hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Navigasi admin</DialogTitle>
          </DialogHeader>
          <AdminSidebar onNavigate={() => setIsNavigationOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="min-h-svh lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Buka menu navigasi"
              className="lg:hidden"
              onClick={() => setIsNavigationOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {pageTitle}
              </h1>
            </div>

            <div className="relative hidden w-full max-w-xs sm:block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label="Cari di dashboard"
                placeholder="Cari order atau pelanggan..."
                className="h-9 bg-background pl-9"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Notifikasi"
            >
              <Bell aria-hidden="true" />
            </Button>

            <div className="h-8 w-px bg-border" aria-hidden="true" />
            <AdminProfile />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AuthorizationGuard requiredRole="ADMIN">
      <AdminApplicationLayout />
    </AuthorizationGuard>
  );
}
