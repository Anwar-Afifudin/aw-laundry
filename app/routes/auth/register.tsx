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
  CircleCheck,
  LoaderCircle,
  MailCheck,
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
import { supabase } from "~/lib/supabase/client";

export const meta = () => [
  { title: "Daftar | A&W Laundry" },
  { name: "description", content: "Buat akun pelanggan A&W Laundry." },
];

type RegistrationValues = {
  full_name: string;
  phone: string;
  email: string;
  password: string;
  confirm_password: string;
};

type RegistrationField = keyof RegistrationValues;
type RegistrationErrors = Partial<Record<RegistrationField, string>>;
type RegistrationStatus =
  | "idle"
  | "submitting"
  | "signed-in"
  | "confirmation-required";

const INITIAL_VALUES: RegistrationValues = {
  full_name: "",
  phone: "",
  email: "",
  password: "",
  confirm_password: "",
};

const REGISTRATION_FIELDS: readonly RegistrationField[] = [
  "full_name",
  "phone",
  "email",
  "password",
  "confirm_password",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFieldError(
  field: RegistrationField,
  values: RegistrationValues,
): string | undefined {
  switch (field) {
    case "full_name":
      return values.full_name.trim() ? undefined : "Nama lengkap wajib diisi.";
    case "phone":
      return values.phone.trim() ? undefined : "Nomor telepon wajib diisi.";
    case "email": {
      const email = values.email.trim();

      if (!email) {
        return "Email wajib diisi.";
      }

      return EMAIL_PATTERN.test(email)
        ? undefined
        : "Masukkan alamat email yang valid.";
    }
    case "password":
      if (!values.password) {
        return "Kata sandi wajib diisi.";
      }

      return values.password.length >= 8
        ? undefined
        : "Kata sandi minimal 8 karakter.";
    case "confirm_password":
      if (!values.confirm_password) {
        return "Konfirmasi kata sandi wajib diisi.";
      }

      return values.confirm_password === values.password
        ? undefined
        : "Konfirmasi kata sandi harus sama.";
  }
}

function validateRegistration(values: RegistrationValues): RegistrationErrors {
  return REGISTRATION_FIELDS.reduce<RegistrationErrors>((errors, field) => {
    const error = getFieldError(field, values);

    if (error) {
      errors[field] = error;
    }

    return errors;
  }, {});
}

function getRegistrationErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Tidak dapat terhubung ke layanan pendaftaran. Periksa koneksi internet Anda lalu coba lagi.";
  }

  if (!error || typeof error !== "object") {
    return "Pendaftaran belum berhasil. Silakan coba lagi.";
  }

  const code =
    "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
  const status =
    "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;

  switch (code) {
    case "email_exists":
    case "user_already_exists":
      return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
    case "email_address_invalid":
      return "Alamat email tidak valid. Periksa kembali email Anda.";
    case "weak_password":
      return "Kata sandi belum memenuhi persyaratan keamanan. Gunakan minimal 8 karakter.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Terlalu banyak percobaan pendaftaran. Tunggu beberapa saat lalu coba lagi.";
    case "signup_disabled":
      return "Pendaftaran sedang tidak tersedia. Silakan coba lagi nanti.";
    default:
      if (status === 429) {
        return "Terlalu banyak percobaan pendaftaran. Tunggu beberapa saat lalu coba lagi.";
      }

      if (status && status >= 500) {
        return "Layanan pendaftaran sedang mengalami gangguan. Silakan coba lagi beberapa saat lagi.";
      }

      return "Pendaftaran belum berhasil. Periksa data Anda lalu coba lagi.";
  }
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

function LoginPrompt() {
  return (
    <p>
      Sudah punya akun?{" "}
      <Link
        to="/login"
        className="font-semibold text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
      >
        Masuk
      </Link>
    </p>
  );
}

function RegistrationSuccess({
  email,
  requiresConfirmation,
}: {
  email: string;
  requiresConfirmation: boolean;
}) {
  return (
    <AuthFormShell
      title={requiresConfirmation ? "Periksa email Anda" : "Akun berhasil dibuat"}
      description={
        requiresConfirmation
          ? "Selesaikan konfirmasi email sebelum masuk ke akun Anda."
          : "Akun pelanggan Anda sudah siap digunakan."
      }
      footer={requiresConfirmation ? <LoginPrompt /> : undefined}
    >
      <div className="space-y-5">
        <Alert className="border-green-200 bg-green-50 px-3 py-3 text-green-900 [&_[data-slot=alert-description]]:text-green-800">
          {requiresConfirmation ? (
            <MailCheck aria-hidden="true" />
          ) : (
            <CircleCheck aria-hidden="true" />
          )}
          <AlertTitle>
            {requiresConfirmation
              ? "Akun berhasil dibuat"
              : "Pendaftaran berhasil"}
          </AlertTitle>
          <AlertDescription className="leading-6">
            {requiresConfirmation ? (
              <p>
                Anda belum masuk. Periksa kotak masuk atau folder spam di{" "}
                <span className="break-all font-semibold text-green-900">
                  {email}
                </span>
                , lalu buka tautan konfirmasi yang kami kirimkan.
              </p>
            ) : (
              <p>
                Anda sudah masuk. Kami sedang mengalihkan Anda ke area
                pelanggan.
              </p>
            )}
          </AlertDescription>
        </Alert>

        {!requiresConfirmation ? (
          <p className="text-center text-sm leading-6 text-slate-600">
            Jika halaman tidak berpindah otomatis,{" "}
            <Link
              to="/app"
              className="font-semibold text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
            >
              lanjut ke area pelanggan
            </Link>
            .
          </p>
        ) : null}
      </div>
    </AuthFormShell>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const submissionInProgress = useRef(false);
  const [values, setValues] = useState<RegistrationValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<RegistrationErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>("idle");

  const isSubmitting = status === "submitting";

  useEffect(() => {
    if (status !== "signed-in") {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      void navigate("/app", { replace: true });
    }, 1200);

    return () => window.clearTimeout(redirectTimer);
  }, [navigate, status]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.currentTarget.name as RegistrationField;
    const nextValues = {
      ...values,
      [field]: event.currentTarget.value,
    };

    setValues(nextValues);
    setSubmissionError(null);

    setFieldErrors((currentErrors) => {
      if (
        !currentErrors[field] &&
        !(field === "password" && currentErrors.confirm_password)
      ) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      const fieldError = getFieldError(field, nextValues);

      if (fieldError) {
        nextErrors[field] = fieldError;
      } else {
        delete nextErrors[field];
      }

      if (field === "password" && currentErrors.confirm_password) {
        const confirmationError = getFieldError(
          "confirm_password",
          nextValues,
        );

        if (confirmationError) {
          nextErrors.confirm_password = confirmationError;
        } else {
          delete nextErrors.confirm_password;
        }
      }

      return nextErrors;
    });
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const field = event.currentTarget.name as RegistrationField;
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submissionInProgress.current) {
      return;
    }

    const normalizedValues: RegistrationValues = {
      ...values,
      full_name: values.full_name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
    };
    const validationErrors = validateRegistration(normalizedValues);

    setValues(normalizedValues);
    setFieldErrors(validationErrors);
    setSubmissionError(null);

    const firstInvalidField = REGISTRATION_FIELDS.find(
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
    setStatus("submitting");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedValues.email,
        password: normalizedValues.password,
        options: {
          data: {
            full_name: normalizedValues.full_name,
            phone: normalizedValues.phone,
          },
        },
      });

      if (error) {
        setSubmissionError(getRegistrationErrorMessage(error));
        setStatus("idle");
        return;
      }

      setValues((currentValues) => ({
        ...currentValues,
        password: "",
        confirm_password: "",
      }));
      setStatus(data.session ? "signed-in" : "confirmation-required");
    } catch (error) {
      setSubmissionError(getRegistrationErrorMessage(error));
      setStatus("idle");
    } finally {
      submissionInProgress.current = false;
    }
  };

  if (status === "signed-in" || status === "confirmation-required") {
    return (
      <RegistrationSuccess
        email={values.email}
        requiresConfirmation={status === "confirmation-required"}
      />
    );
  }

  return (
    <AuthFormShell
      title="Buat akun pelanggan"
      description="Daftar untuk mulai membuat dan memantau pesanan laundry Anda."
      footer={<LoginPrompt />}
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
            <AlertTitle>Pendaftaran belum berhasil</AlertTitle>
            <AlertDescription className="leading-6">
              {submissionError}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="register-name">
            Nama lengkap <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-name"
            name="full_name"
            autoComplete="name"
            placeholder="Nama lengkap Anda"
            className="h-11"
            value={values.full_name}
            disabled={isSubmitting}
            required
            aria-invalid={Boolean(fieldErrors.full_name)}
            aria-describedby={
              fieldErrors.full_name ? "register-name-error" : undefined
            }
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FieldError
            id="register-name-error"
            message={fieldErrors.full_name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-phone">
            Nomor telepon <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Contoh: 081234567890"
            className="h-11"
            value={values.phone}
            disabled={isSubmitting}
            required
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={
              fieldErrors.phone ? "register-phone-error" : undefined
            }
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FieldError
            id="register-phone-error"
            message={fieldErrors.phone}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">
            Email <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-email"
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
              fieldErrors.email ? "register-email-error" : undefined
            }
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FieldError
            id="register-email-error"
            message={fieldErrors.email}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">
            Kata sandi <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            className="h-11"
            value={values.password}
            disabled={isSubmitting}
            minLength={8}
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password
                ? "register-password-help register-password-error"
                : "register-password-help"
            }
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <p
            id="register-password-help"
            className="text-xs leading-5 text-slate-500"
          >
            Gunakan minimal 8 karakter.
          </p>
          <FieldError
            id="register-password-error"
            message={fieldErrors.password}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password-confirmation">
            Konfirmasi kata sandi <span className="text-red-600">*</span>
          </Label>
          <Input
            id="register-password-confirmation"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="Ulangi kata sandi"
            className="h-11"
            value={values.confirm_password}
            disabled={isSubmitting}
            minLength={8}
            required
            aria-invalid={Boolean(fieldErrors.confirm_password)}
            aria-describedby={
              fieldErrors.confirm_password
                ? "register-password-confirmation-error"
                : undefined
            }
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FieldError
            id="register-password-confirmation-error"
            message={fieldErrors.confirm_password}
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
              Membuat akun...
            </>
          ) : (
            <>
              Buat akun
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </AuthFormShell>
  );
}
