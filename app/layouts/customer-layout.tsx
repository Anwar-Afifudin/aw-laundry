import type { LucideIcon } from "lucide-react";
import {
  ClipboardListIcon,
  HouseIcon,
  MessageCircleIcon,
  PlusIcon,
  UserRoundIcon,
} from "lucide-react";
import { NavLink, Outlet } from "react-router";

import { BrandLogo } from "~/components/shared/brand-logo";
import { AuthorizationGuard } from "~/features/auth/components/authorization-guard";
import { cn } from "~/lib/utils";

type CustomerNavigationItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  featured?: boolean;
};

const customerNavigation: CustomerNavigationItem[] = [
  { label: "Home", to: "/app", icon: HouseIcon },
  { label: "Orders", to: "/app/orders", icon: ClipboardListIcon },
  {
    label: "New Order",
    to: "/app/orders/new",
    icon: PlusIcon,
    featured: true,
  },
  { label: "Chat", to: "/app/chat", icon: MessageCircleIcon },
  { label: "Profile", to: "/app/profile", icon: UserRoundIcon },
];

function DesktopNavigation() {
  return (
    <nav
      aria-label="Navigasi pelanggan utama"
      className="hidden flex-1 items-center justify-center gap-1 md:flex"
    >
      {customerNavigation.slice(0, 4).map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                !item.featured &&
                  isActive &&
                  "bg-blue-50 text-blue-700 hover:bg-blue-50",
                item.featured &&
                  "bg-blue-600 text-white hover:bg-blue-700 hover:text-white",
                item.featured && isActive && "bg-blue-700 ring-2 ring-blue-200",
              )
            }
          >
            <Icon aria-hidden="true" className="size-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function MobileNavigation() {
  return (
    <nav
      aria-label="Navigasi pelanggan"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {customerNavigation.map((item) => {
          const Icon = item.icon;

          if (item.featured) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                aria-label={item.label}
                className="group -mt-7 flex min-h-20 flex-col items-center justify-end gap-1 rounded-xl text-xs font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-lg transition-colors group-hover:bg-blue-700",
                        isActive && "bg-blue-700 ring-2 ring-blue-200",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className={cn(isActive && "text-blue-700")}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.6875rem] font-medium text-slate-500 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                  isActive && "text-blue-700",
                )
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function CustomerApplicationLayout() {
  return (
    <div className="min-h-svh bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <BrandLogo to="/app" className="shrink-0" />
          <DesktopNavigation />

          <span className="ml-auto text-xs font-semibold tracking-wide text-slate-500 uppercase md:hidden">
            Area Pelanggan
          </span>

          <NavLink
            to="/app/profile"
            end
            className={({ isActive }) =>
              cn(
                "ml-auto hidden items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pr-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:flex",
                isActive && "border-blue-200 bg-blue-50",
              )
            }
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <UserRoundIcon aria-hidden="true" className="size-4" />
            </span>
            <span className="hidden leading-tight lg:block">
              <span className="block text-sm font-semibold text-slate-900">
                Pelanggan
              </span>
              <span className="block text-xs text-slate-500">Lihat profil</span>
            </span>
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 sm:px-6 md:pb-10 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <MobileNavigation />
    </div>
  );
}

export default function CustomerLayout() {
  return (
    <AuthorizationGuard requiredRole="CUSTOMER">
      <CustomerApplicationLayout />
    </AuthorizationGuard>
  );
}
