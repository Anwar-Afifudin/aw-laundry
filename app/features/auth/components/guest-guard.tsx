import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { Navigate } from "react-router";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { getRoleHome, isAppRole, type RoleHome } from "~/features/auth/roles";
import { supabase } from "~/lib/supabase/client";

type GuestGuardProps = {
  children: ReactNode;
};

type AccessProfile = {
  id: string;
  role: string;
  is_active: boolean;
};

type GuestGuardState =
  | { status: "checking" }
  | { status: "guest"; message?: string }
  | { status: "redirect"; to: RoleHome }
  | { status: "error" };

const INACTIVE_ACCOUNT_MESSAGE =
  "Akun Anda sedang tidak aktif. Hubungi A&W Laundry untuk mendapatkan bantuan.";
const INVALID_PROFILE_MESSAGE =
  "Profil akun tidak valid. Silakan masuk kembali atau hubungi A&W Laundry.";

async function clearInvalidSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Guard tetap tidak membuka area protected; pengguna dapat mencoba lagi.
  }
}

function GuestGuardLoading() {
  return (
    <div
      className="w-full space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80"
      aria-busy="true"
      aria-label="Memeriksa sesi akun"
    >
      <Skeleton className="mx-auto h-6 w-44" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        Memeriksa sesi akun Anda...
      </p>
    </div>
  );
}

export function GuestGuard({ children }: GuestGuardProps) {
  const verificationRun = useRef(0);
  const [state, setState] = useState<GuestGuardState>({ status: "checking" });

  const verifyAccess = useCallback(async () => {
    const run = verificationRun.current + 1;
    verificationRun.current = run;
    setState({ status: "checking" });

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (run !== verificationRun.current) return;

      if (sessionError) {
        setState({ status: "error" });
        return;
      }

      if (!session) {
        setState({ status: "guest" });
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (run !== verificationRun.current) return;

      if (userError || !user || user.id !== session.user.id) {
        await clearInvalidSession();
        if (run === verificationRun.current) {
          setState({ status: "guest", message: INVALID_PROFILE_MESSAGE });
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, is_active")
        .eq("id", user.id)
        .maybeSingle<AccessProfile>();

      if (run !== verificationRun.current) return;

      if (profileError) {
        setState({ status: "error" });
        return;
      }

      if (!profile || profile.id !== user.id || !isAppRole(profile.role)) {
        await clearInvalidSession();
        if (run === verificationRun.current) {
          setState({ status: "guest", message: INVALID_PROFILE_MESSAGE });
        }
        return;
      }

      if (!profile.is_active) {
        await clearInvalidSession();
        if (run === verificationRun.current) {
          setState({ status: "guest", message: INACTIVE_ACCOUNT_MESSAGE });
        }
        return;
      }

      setState({ status: "redirect", to: getRoleHome(profile.role) });
    } catch {
      if (run === verificationRun.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void verifyAccess();

    return () => {
      verificationRun.current += 1;
    };
  }, [verifyAccess]);

  if (state.status === "checking") return <GuestGuardLoading />;
  if (state.status === "redirect") {
    return <Navigate to={state.to} replace />;
  }
  if (state.status === "error") {
    return (
      <div className="w-full space-y-4">
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Sesi belum dapat diperiksa</AlertTitle>
          <AlertDescription>
            Periksa koneksi Anda, lalu coba lagi.
          </AlertDescription>
        </Alert>
        <Button type="button" className="w-full" onClick={() => void verifyAccess()}>
          <RefreshCwIcon aria-hidden="true" /> Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {state.message ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Akun tidak dapat digunakan</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {children}
    </div>
  );
}
