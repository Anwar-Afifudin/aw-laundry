import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AuthFormShell } from "~/features/auth/components/auth-form-shell";
import { getRoleHome, isAppRole } from "~/features/auth/roles";
import { supabase } from "~/lib/supabase/client";

export const meta = () => [
  { title: "Masuk | A&W Laundry" },
  { name: "description", content: "Masuk ke akun A&W Laundry Anda." },
];

type LoginValues = {
  email: string;
  password: string;
};

type LoginField = keyof LoginValues;
type LoginErrors = Partial<Record<LoginField, string>>;
type LoginStatus = "idle" | "authenticating" | "verifying-profile";

type LoginProfile = {
  id: string;
  role: string;
  full_name: string;
  is_active: boolean;
};

const INITIAL_VALUES: LoginValues = {
  email: "",
  password: "",
};

const LOGIN_FIELDS: readonly LoginField[] = ["email", "password"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE_VERIFICATION_ERROR =
  "Kami tidak dapat memverifikasi akun Anda. Silakan coba lagi atau hubungi A&W Laundry.";
const INACTIVE_ACCOUNT_ERROR =
  "Akun Anda sedang tidak aktif. Hubungi A&W Laundry untuk mendapatkan bantuan.";
const UNKNOWN_ROLE_ERROR =
  "Peran akun ini tidak dikenali. Hubungi A&W Laundry untuk mendapatkan bantuan.";
const SESSION_CLEANUP_ERROR =
  "Login dihentikan, tetapi sesi tidak dapat ditutup dengan aman. Jangan lanjutkan penggunaan aplikasi dan hubungi A&W Laundry.";

function getFieldError(
  field: LoginField,
  values: LoginValues,
): string | undefined {
  if (field === "password") {
    return values.password ? undefined : "Kata sandi wajib diisi.";
  }

  const email = values.email.trim();

  if (!email) {
    return "Email wajib diisi.";
  }

  return EMAIL_PATTERN.test(email)
    ? undefined
    : "Masukkan alamat email yang valid.";
}

function validateLogin(values: LoginValues): LoginErrors {
  return LOGIN_FIELDS.reduce<LoginErrors>((errors, field) => {
    const error = getFieldError(field, values);

    if (error) {
      errors[field] = error;
    }

    return errors;
  }, {});
}

function getAuthenticationErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Tidak dapat terhubung ke layanan login. Periksa koneksi internet Anda lalu coba lagi.";
  }

  if (!error || typeof error !== "object") {
    return "Login belum berhasil. Silakan coba lagi.";
  }

  const code =
    "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
  const status =
    "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;

  if (status === 0) {
    return "Tidak dapat terhubung ke layanan login. Periksa koneksi internet Anda lalu coba lagi.";
  }

  switch (code) {
    case "invalid_credentials":
    case "user_not_found":
      return "Email atau kata sandi salah. Periksa kembali data Anda.";
    case "email_not_confirmed":
      return "Email Anda belum dikonfirmasi. Periksa kotak masuk atau folder spam, lalu buka tautan konfirmasi.";
    case "over_request_rate_limit":
      return "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi.";
    case "user_banned":
      return "Akun ini tidak dapat digunakan. Hubungi A&W Laundry untuk mendapatkan bantuan.";
    default:
      if (status === 429) {
        return "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi.";
      }

      if (status && status >= 500) {
        return "Layanan login sedang mengalami gangguan. Silakan coba lagi beberapa saat lagi.";
      }

      return "Login belum berhasil. Periksa email dan kata sandi Anda lalu coba lagi.";
  }
}

async function signOutRejectedSession(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await supabase.auth.signOut({ scope: "local" });
      const { data, error } = await supabase.auth.getSession();

      if (!error && !data.session) {
        return true;
      }
    } catch {
      // Coba sekali lagi tanpa menampilkan detail teknis kepada pengguna.
    }
  }

  return false;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-sm leading-5 text-red-600">
      {message}
    </p>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const submissionInProgress = useRef(false);
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSubmitting = status !== "idle";

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.currentTarget.name as LoginField;
    const nextValues = {
      ...values,
      [field]: event.currentTarget.value,
    };

    setValues(nextValues);
    setSubmissionError(null);

    if (fieldErrors[field]) {
      const error = getFieldError(field, nextValues);

      setFieldErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };

        if (error) {
          nextErrors[field] = error;
        } else {
          delete nextErrors[field];
        }

        return nextErrors;
      });
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const field = event.currentTarget.name as LoginField;
    const error = getFieldError(field, values);

    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const rejectAuthenticatedSession = async (message: string) => {
    const sessionWasCleared = await signOutRejectedSession();

    if (!isMounted.current) {
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      password: "",
    }));
    setSubmissionError(
      sessionWasCleared ? message : `${message} ${SESSION_CLEANUP_ERROR}`,
    );
    setStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submissionInProgress.current) {
      return;
    }

    const normalizedValues: LoginValues = {
      ...values,
      email: values.email.trim(),
    };
    const validationErrors = validateLogin(normalizedValues);

    setValues(normalizedValues);
    setFieldErrors(validationErrors);
    setSubmissionError(null);

    const firstInvalidField = LOGIN_FIELDS.find(
      (field) => validationErrors[field],
    );

    if (firstInvalidField) {
      const invalidControl =
        event.currentTarget.elements.namedItem(firstInvalidField);

      if (invalidControl instanceof HTMLInputElement) {
        invalidControl.focus();
      }

      return;
    }

    submissionInProgress.current = true;
    setStatus("authenticating");
    let authenticatedSessionCreated = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedValues.email,
        password: normalizedValues.password,
      });

      if (error) {
        if (!isMounted.current) {
          return;
        }

        setSubmissionError(getAuthenticationErrorMessage(error));
        setStatus("idle");
        return;
      }

      authenticatedSessionCreated = Boolean(data.session);

      if (!isMounted.current) {
        if (authenticatedSessionCreated) {
          await signOutRejectedSession();
        }

        return;
      }

      if (!data.user || !data.session) {
        await rejectAuthenticatedSession(PROFILE_VERIFICATION_ERROR);
        return;
      }

      setStatus("verifying-profile");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, full_name, is_active")
        .eq("id", data.user.id)
        .maybeSingle<LoginProfile>();

      if (!isMounted.current) {
        await signOutRejectedSession();
        return;
      }

      if (profileError || !profile || profile.id !== data.user.id) {
        await rejectAuthenticatedSession(PROFILE_VERIFICATION_ERROR);
        return;
      }

      if (!profile.is_active) {
        await rejectAuthenticatedSession(INACTIVE_ACCOUNT_ERROR);
        return;
      }

      if (!isAppRole(profile.role)) {
        await rejectAuthenticatedSession(UNKNOWN_ROLE_ERROR);
        return;
      }

      setValues((currentValues) => ({
        ...currentValues,
        password: "",
      }));
      void navigate(getRoleHome(profile.role), { replace: true });
    } catch (error) {
      let sessionWasCleared = true;

      if (authenticatedSessionCreated) {
        sessionWasCleared = await signOutRejectedSession();
      }

      if (!isMounted.current) {
        return;
      }

      if (authenticatedSessionCreated) {
        setValues((currentValues) => ({
          ...currentValues,
          password: "",
        }));
      }

      const authenticationError = getAuthenticationErrorMessage(error);

      setSubmissionError(
        sessionWasCleared
          ? authenticationError
          : `${authenticationError} ${SESSION_CLEANUP_ERROR}`,
      );
      setStatus("idle");
    } finally {
      submissionInProgress.current = false;
    }
  };

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
        noValidate
        aria-busy={isSubmitting}
        onSubmit={handleSubmit}
      >
        {submissionError ? (
          <Alert variant="destructive" className="px-3 py-3">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Login belum berhasil</AlertTitle>
            <AlertDescription className="leading-6">
              {submissionError}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="login-email">
            Email <span className="text-red-600">*</span>
          </Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nama@email.com"
            className="h-11"
            value={values.email}
            disabled={isSubmitting}
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "login-email-error" : undefined
            }
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FieldError id="login-email-error" message={fieldErrors.email} />
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
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              className="h-11 pr-11"
              value={values.password}
              disabled={isSubmitting}
              required
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "login-password-error" : undefined
              }
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
              disabled={isSubmitting}
              aria-controls="login-password"
              aria-label={
                isPasswordVisible
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"
              }
              onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            >
              {isPasswordVisible ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </Button>
          </div>
          <FieldError
            id="login-password-error"
            message={fieldErrors.password}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
              {status === "verifying-profile"
                ? "Memeriksa akun..."
                : "Masuk..."}
            </>
          ) : (
            <>
              Masuk
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </AuthFormShell>
  );
}
