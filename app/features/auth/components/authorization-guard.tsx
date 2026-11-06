import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Navigate } from "react-router";

import { BrandLogo } from "~/components/shared/brand-logo";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { supabase } from "~/lib/supabase/client";

type AppRole = "CUSTOMER" | "ADMIN";

type AccessProfile = {
  id: string;
  role: string;
  full_name: string;
  is_active: boolean;
};

type GuardState =
  | { status: "checking" }
  | { status: "authorized" }
  | { status: "redirect"; to: "/login" | "/app" }
  | { status: "unavailable" }
  | { status: "blocked" };

type AuthorizationGuardProps = {
  requiredRole: AppRole;
  children: ReactNode;
};

type SessionCleanupResult = "cleared" | "changed" | "cancelled" | "failed";

function isKnownRole(role: string): role is AppRole {
  return role === "CUSTOMER" || role === "ADMIN";
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
}

function isInvalidSessionError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  const name = error instanceof Error ? error.name : undefined;

  return (
    status === 401 ||
    status === 403 ||
    name === "AuthSessionMissingError" ||
    code === "session_not_found" ||
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "bad_jwt"
  );
}

async function clearLocalSession(
  expectedUserId: string | undefined,
  shouldContinue: () => boolean,
): Promise<SessionCleanupResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const {
        data: { session: sessionBeforeCleanup },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!shouldContinue()) {
        return "cancelled";
      }

      if (sessionError) {
        continue;
      }

      if (!sessionBeforeCleanup) {
        return "cleared";
      }

      if (
        expectedUserId &&
        sessionBeforeCleanup.user.id !== expectedUserId
      ) {
        return "changed";
      }

      await supabase.auth.signOut({ scope: "local" });
      const {
        data: { session: sessionAfterCleanup },
        error: verificationError,
      } = await supabase.auth.getSession();

      if (!verificationError && !sessionAfterCleanup) {
        return "cleared";
      }

      if (
        expectedUserId &&
        sessionAfterCleanup &&
        sessionAfterCleanup.user.id !== expectedUserId
      ) {
        return "changed";
      }
    } catch {
      // Coba sekali lagi tanpa menampilkan detail teknis kepada pengguna.
    }
  }

  return "failed";
}

function AuthorizationLoadingState() {
  return (
    <main
      className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10"
      aria-busy="true"
    >
      <div className="w-full max-w-sm space-y-6" role="status" aria-live="polite">
        <BrandLogo className="mx-auto" />
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <Skeleton className="mx-auto h-5 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mx-auto h-3 w-4/5" />
          </div>
          <p className="text-center text-sm font-medium text-slate-600">
            Memeriksa akses akun Anda...
          </p>
        </div>
      </div>
    </main>
  );
}

function AuthorizationErrorState({
  isBlocked,
  onRetry,
}: {
  isBlocked: boolean;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <BrandLogo className="mx-auto" />
        <div className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <Alert variant="destructive" className="px-3 py-3">
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>
              {isBlocked
                ? "Sesi tidak dapat diamankan"
                : "Akses belum dapat diverifikasi"}
            </AlertTitle>
            <AlertDescription className="leading-6">
              {isBlocked
                ? "Kami tidak dapat menutup sesi ini dengan aman. Jangan lanjutkan penggunaan aplikasi dan coba lagi."
                : "Terjadi gangguan saat memeriksa akses akun Anda. Periksa koneksi lalu coba lagi."}
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            size="lg"
            className="h-11 w-full"
            onClick={onRetry}
          >
            Coba lagi
          </Button>
        </div>
      </div>
    </main>
  );
}

export function AuthorizationGuard({
  requiredRole,
  children,
}: AuthorizationGuardProps) {
  const [guardState, setGuardState] = useState<GuardState>({
    status: "checking",
  });
  const [retryKey, setRetryKey] = useState(0);
  const authorizedUserId = useRef<string | null>(null);
  const verificationRun = useRef(0);

  useEffect(() => {
    let isActive = true;
    let scheduledVerification: number | undefined;
    let scheduledVerificationIsBlocking = false;
    let cleanupRun = 0;

    const isCurrentRun = (run: number) =>
      isActive && run === verificationRun.current;

    function scheduleVerification(showLoading: boolean) {
      verificationRun.current += 1;
      scheduledVerificationIsBlocking =
        scheduledVerificationIsBlocking || showLoading;

      if (showLoading) {
        setGuardState({ status: "checking" });
      }

      if (scheduledVerification !== undefined) {
        window.clearTimeout(scheduledVerification);
      }

      scheduledVerification = window.setTimeout(() => {
        const shouldShowLoading = scheduledVerificationIsBlocking;

        scheduledVerification = undefined;
        scheduledVerificationIsBlocking = false;
        void verifyAccess(shouldShowLoading);
      }, 0);
    }

    async function rejectSession(
      run: number,
      expectedUserId: string | undefined,
    ) {
      if (!isCurrentRun(run)) {
        return;
      }

      const currentCleanupRun = cleanupRun + 1;
      cleanupRun = currentCleanupRun;

      const cleanupResult = await clearLocalSession(
        expectedUserId,
        () => isCurrentRun(run),
      );

      if (!isActive || currentCleanupRun !== cleanupRun) {
        return;
      }

      if (cleanupResult === "changed" || cleanupResult === "cancelled") {
        scheduleVerification(true);
        return;
      }

      authorizedUserId.current = null;
      setGuardState(
        cleanupResult === "cleared"
          ? { status: "redirect", to: "/login" }
          : { status: "blocked" },
      );
    }

    async function verifyAccess(showLoading: boolean) {
      const run = verificationRun.current + 1;
      verificationRun.current = run;

      if (showLoading) {
        setGuardState({ status: "checking" });
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!isCurrentRun(run)) {
          return;
        }

        if (sessionError) {
          if (isInvalidSessionError(sessionError)) {
            await rejectSession(run, session?.user.id);
          } else {
            setGuardState({ status: "unavailable" });
          }

          return;
        }

        if (!session) {
          authorizedUserId.current = null;
          setGuardState({ status: "redirect", to: "/login" });
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isCurrentRun(run)) {
          return;
        }

        if (userError || !user || user.id !== session.user.id) {
          if (userError && !isInvalidSessionError(userError)) {
            setGuardState({ status: "unavailable" });
          } else {
            await rejectSession(run, session.user.id);
          }

          return;
        }

        const {
          data: profile,
          error: profileError,
          status: profileStatus,
        } = await supabase
          .from("profiles")
          .select("id, role, full_name, is_active")
          .eq("id", user.id)
          .maybeSingle<AccessProfile>();

        if (!isCurrentRun(run)) {
          return;
        }

        if (profileError) {
          if (profileStatus === 401 || profileStatus === 403) {
            await rejectSession(run, user.id);
          } else {
            setGuardState({ status: "unavailable" });
          }

          return;
        }

        if (
          !profile ||
          profile.id !== user.id ||
          !profile.is_active ||
          !isKnownRole(profile.role)
        ) {
          await rejectSession(run, user.id);
          return;
        }

        authorizedUserId.current = user.id;

        if (profile.role === requiredRole) {
          setGuardState({ status: "authorized" });
          return;
        }

        setGuardState({
          status: "redirect",
          to:
            requiredRole === "ADMIN" && profile.role === "CUSTOMER"
              ? "/app"
              : "/login",
        });
      } catch {
        if (isCurrentRun(run)) {
          setGuardState({ status: "unavailable" });
        }
      }
    }

    void verifyAccess(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive || event === "INITIAL_SESSION") {
        return;
      }

      if (event === "SIGNED_OUT" || !session) {
        verificationRun.current += 1;
        cleanupRun += 1;
        authorizedUserId.current = null;

        if (scheduledVerification !== undefined) {
          window.clearTimeout(scheduledVerification);
          scheduledVerification = undefined;
          scheduledVerificationIsBlocking = false;
        }

        setGuardState({ status: "redirect", to: "/login" });
        return;
      }

      cleanupRun += 1;
      scheduleVerification(authorizedUserId.current !== session.user.id);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleVerification(authorizedUserId.current === null);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      verificationRun.current += 1;
      cleanupRun += 1;

      if (scheduledVerification !== undefined) {
        window.clearTimeout(scheduledVerification);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [requiredRole, retryKey]);

  if (guardState.status === "checking") {
    return <AuthorizationLoadingState />;
  }

  if (guardState.status === "redirect") {
    return <Navigate to={guardState.to} replace />;
  }

  if (
    guardState.status === "unavailable" ||
    guardState.status === "blocked"
  ) {
    return (
      <AuthorizationErrorState
        isBlocked={guardState.status === "blocked"}
        onRetry={() => setRetryKey((currentKey) => currentKey + 1)}
      />
    );
  }

  return children;
}
