import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  LogOutIcon,
  UserRoundIcon,
} from "lucide-react";
import { Link } from "react-router";

import { useLogout } from "~/features/auth/hooks/use-logout";
import { supabase } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type AccountMenuProps = {
  roleLabel: string;
  fallbackName: string;
  profilePath?: string;
  className?: string;
};

type AccountProfile = {
  full_name: string;
};

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("id-ID"))
    .join("");

  return initials || "AW";
}

export function AccountMenu({
  roleLabel,
  fallbackName,
  profilePath,
  className,
}: AccountMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(fallbackName);
  const { isLoggingOut, logoutError, logout } = useLogout();

  useEffect(() => {
    let isActive = true;

    async function loadDisplayName() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isActive || userError || !user) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle<AccountProfile>();

      if (!isActive || profileError || !profile) return;

      const name = profile.full_name.trim();
      if (name) setDisplayName(name);
    }

    void loadDisplayName();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="account-menu"
        className="flex min-h-10 max-w-56 items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {getInitials(displayName)}
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {roleLabel}
          </span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "hidden size-4 shrink-0 text-muted-foreground transition-transform sm:block",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen ? (
        <div
          id="account-menu"
          role="menu"
          aria-label="Menu akun"
          className="absolute top-full right-0 z-50 mt-2 w-64 rounded-xl bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        >
          <div className="border-b px-2 py-2.5">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{roleLabel}</p>
          </div>

          {profilePath ? (
            <Link
              to={profilePath}
              role="menuitem"
              className="mt-1 flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsOpen(false)}
            >
              <UserRoundIcon aria-hidden="true" className="size-4" />
              Lihat profil
            </Link>
          ) : null}

          <button
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            onClick={() => void logout()}
          >
            {isLoggingOut ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <LogOutIcon aria-hidden="true" className="size-4" />
            )}
            {isLoggingOut ? "Sedang keluar..." : "Keluar"}
          </button>

          {logoutError ? (
            <p
              role="alert"
              className="mt-2 flex gap-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs leading-5 text-red-700"
            >
              <CircleAlertIcon
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {logoutError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
