import { useRef, useState } from "react";
import { useNavigate } from "react-router";

import { supabase } from "~/lib/supabase/client";

const LOGOUT_ERROR_MESSAGE =
  "Anda belum berhasil keluar. Periksa koneksi lalu coba lagi.";

export function useLogout() {
  const navigate = useNavigate();
  const logoutInProgress = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const logout = async () => {
    if (logoutInProgress.current) return;

    logoutInProgress.current = true;
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        logoutInProgress.current = false;
        setIsLoggingOut(false);
        setLogoutError(LOGOUT_ERROR_MESSAGE);
        return;
      }

      void navigate("/login", { replace: true });
    } catch {
      logoutInProgress.current = false;
      setIsLoggingOut(false);
      setLogoutError(LOGOUT_ERROR_MESSAGE);
    }
  };

  return { isLoggingOut, logoutError, logout };
}
