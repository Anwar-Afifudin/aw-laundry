import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Clock3Icon, LoaderCircleIcon, LogOutIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { AppRole } from "~/features/auth/roles";
import { supabase } from "~/lib/supabase/client";

type IdleSessionManagerProps = {
  role: AppRole;
  children: ReactNode;
};

type IdleSessionConfig = {
  timeoutMs: number;
  warningMs: number;
};

const IDLE_SESSION_CONFIG: Record<AppRole, IdleSessionConfig> = {
  ADMIN: {
    timeoutMs: 10 * 60 * 1000,
    warningMs: 1 * 60 * 1000,
  },
  CUSTOMER: {
    timeoutMs: 15 * 60 * 1000,
    warningMs: 2 * 60 * 1000,
  },
};

const STORAGE_PREFIX = "aw-laundry:last-activity";
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readLastActivity(key: string) {
  try {
    const value = window.localStorage.getItem(key);

    if (!value) return null;

    const timestamp = Number(value);

    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  } catch {
    return null;
  }
}

function writeLastActivity(key: string, timestamp: number) {
  try {
    window.localStorage.setItem(key, String(timestamp));
  } catch {
    // Timer lokal tetap berjalan jika localStorage tidak tersedia.
  }
}

function removeLastActivity(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Tidak menghalangi proses logout.
  }
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} detik`;
  }

  if (seconds === 0) {
    return `${minutes} menit`;
  }

  return `${minutes} menit ${seconds} detik`;
}

export function IdleSessionManager({
  role,
  children,
}: IdleSessionManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const config = IDLE_SESSION_CONFIG[role];

  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(config.timeoutMs);
  const [hasExpired, setHasExpired] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const logoutStartedRef = useRef(false);
  const expiredRef = useRef(false);
  const locationKeyRef = useRef(location.key);

  const markActivity = useCallback(() => {
    if (!storageKey || expiredRef.current || logoutStartedRef.current) {
      return;
    }

    const now = Date.now();

    writeLastActivity(storageKey, now);
    setLastActivity(now);
    setRemainingMs(config.timeoutMs);
    setLogoutError(null);
  }, [config.timeoutMs, storageKey]);

  const expireSession = useCallback(async () => {
    if (logoutStartedRef.current) return;

    logoutStartedRef.current = true;
    expiredRef.current = true;
    setHasExpired(true);
    setIsLoggingOut(true);
    setLogoutError(null);

    if (storageKey) {
      removeLastActivity(storageKey);
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        throw error;
      }

      void navigate("/login", { replace: true });
    } catch {
      logoutStartedRef.current = false;
      setIsLoggingOut(false);
      setLogoutError(
        "Sesi telah berakhir, tetapi proses keluar belum berhasil. Periksa koneksi lalu coba lagi.",
      );
    }
  }, [navigate, storageKey]);

  const evaluateIdleState = useCallback(() => {
    if (lastActivity === null || expiredRef.current) return;

    const remaining = config.timeoutMs - (Date.now() - lastActivity);

    if (remaining <= 0) {
      setRemainingMs(0);
      void expireSession();
      return;
    }

    setRemainingMs(remaining);
  }, [config.timeoutMs, expireSession, lastActivity]);

  useEffect(() => {
    let isActive = true;

    async function initializeIdleSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isActive || error || !session) return;

      const key = getStorageKey(session.user.id);
      const now = Date.now();
      const storedActivity = readLastActivity(key);
      const lastSignInAt = session.user.last_sign_in_at
        ? Date.parse(session.user.last_sign_in_at)
        : Number.NaN;

      let initialActivity = storedActivity ?? now;

      if (
        !storedActivity ||
        storedActivity > now ||
        (Number.isFinite(lastSignInAt) && lastSignInAt > storedActivity)
      ) {
        initialActivity = now;
        writeLastActivity(key, now);
      }

      setStorageKey(key);
      setLastActivity(initialActivity);
      setRemainingMs(
        Math.max(0, config.timeoutMs - (now - initialActivity)),
      );
    }

    void initializeIdleSession();

    return () => {
      isActive = false;
    };
  }, [config.timeoutMs]);

  useEffect(() => {
    if (!storageKey) return;

    const handleActivity = (event: Event) => {
      if (!event.isTrusted) return;

      if (
        event.target instanceof Element &&
        event.target.closest("[data-idle-session-dialog]")
      ) {
        return;
      }

      markActivity();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      document.addEventListener(eventName, handleActivity);
    }

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        document.removeEventListener(eventName, handleActivity);
      }
    };
  }, [markActivity, storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;

      const timestamp = Number(event.newValue);

      if (!Number.isFinite(timestamp) || timestamp <= 0) return;

      setLastActivity(timestamp);
      setRemainingMs(
        Math.max(0, config.timeoutMs - (Date.now() - timestamp)),
      );
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [config.timeoutMs, storageKey]);

  useEffect(() => {
    if (lastActivity === null) return;

    evaluateIdleState();

    const intervalId = window.setInterval(evaluateIdleState, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [evaluateIdleState, lastActivity]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        evaluateIdleState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [evaluateIdleState]);

  useEffect(() => {
    if (locationKeyRef.current === location.key) return;

    locationKeyRef.current = location.key;
    markActivity();
  }, [location.key, markActivity]);

  const shouldShowWarning =
    !hasExpired &&
    lastActivity !== null &&
    remainingMs > 0 &&
    remainingMs <= config.warningMs;

  const roleLabel = role === "ADMIN" ? "admin" : "pelanggan";

  return (
    <>
      {children}

      <Dialog
        open={hasExpired || shouldShowWarning}
        onOpenChange={() => {
          // Dialog dikontrol oleh status sesi dan tidak ditutup tanpa aktivitas.
        }}
      >
        <DialogContent
          data-idle-session-dialog
          showCloseButton={false}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Clock3Icon aria-hidden="true" className="size-5" />
            </div>

            <DialogTitle>
              {hasExpired ? "Sesi telah berakhir" : "Sesi hampir berakhir"}
            </DialogTitle>

            <DialogDescription className="leading-6">
              {hasExpired
                ? `Sesi ${roleLabel} Anda berakhir karena tidak ada aktivitas. Untuk melindungi akun, silakan masuk kembali.`
                : `Tidak ada aktivitas selama beberapa waktu. Sesi ${roleLabel} Anda akan berakhir dalam ${formatRemainingTime(remainingMs)}.`}
            </DialogDescription>
          </DialogHeader>

          {logoutError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
            >
              {logoutError}
            </p>
          ) : null}

          <DialogFooter>
            {hasExpired ? (
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={isLoggingOut}
                onClick={() => void expireSession()}
              >
                {isLoggingOut ? (
                  <LoaderCircleIcon
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <LogOutIcon aria-hidden="true" className="size-4" />
                )}
                {isLoggingOut ? "Mengakhiri sesi..." : "Masuk kembali"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={isLoggingOut}
                  onClick={() => void expireSession()}
                >
                  <LogOutIcon aria-hidden="true" className="size-4" />
                  Keluar sekarang
                </Button>

                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={isLoggingOut}
                  onClick={markActivity}
                >
                  Tetap masuk
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
