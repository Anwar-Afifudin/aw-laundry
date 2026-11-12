import { useEffect, useState } from "react";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  LoaderCircleIcon,
  LogOutIcon,
  MailIcon,
  PhoneIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import { PageHeader } from "~/components/shared/page-header";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useLogout } from "~/features/auth/hooks/use-logout";
import { supabase } from "~/lib/supabase/client";

export function meta() {
  return [
    { title: "Profil | A&W Laundry" },
    {
      name: "description",
      content: "Lihat informasi akun pelanggan A&W Laundry Anda.",
    },
  ];
}

type CustomerProfileRow = {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
};

type CustomerProfile = CustomerProfileRow & {
  email: string;
};

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: CustomerProfile }
  | { status: "error" };

type ProfileDetailProps = {
  icon: typeof MailIcon;
  label: string;
  value: string;
};

const memberSinceFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatMemberSince(createdAt: string) {
  const createdDate = new Date(createdAt);

  return Number.isNaN(createdDate.getTime())
    ? "Tanggal tidak tersedia"
    : memberSinceFormatter.format(createdDate);
}

function ProfileDetail({ icon: Icon, label, value }: ProfileDetailProps) {
  return (
    <div className="flex min-w-0 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {label}
        </dt>
        <dd className="mt-1 break-words font-medium text-slate-900">
          {value}
        </dd>
      </div>
    </div>
  );
}

function ProfileLoadingState() {
  return (
    <Card
      className="max-w-4xl shadow-sm"
      aria-busy="true"
      aria-label="Memuat profil pelanggan"
    >
      <CardHeader className="border-b pb-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[74px] w-full rounded-lg" />
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          Memuat informasi profil Anda...
        </p>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-60 max-w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
      </CardFooter>
    </Card>
  );
}

function ProfileErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="max-w-4xl shadow-sm">
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="p-4">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Profil belum dapat dimuat</AlertTitle>
          <AlertDescription className="leading-6">
            Terjadi gangguan saat memuat informasi akun Anda. Periksa koneksi
            lalu coba lagi.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
          Coba lagi
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileCard({ profile }: { profile: CustomerProfile }) {
  const { isLoggingOut, logoutError, logout } = useLogout();
  const avatarUrl = profile.avatar_url?.trim() || null;

  return (
    <Card className="max-w-4xl shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <UserRoundIcon aria-hidden="true" className="size-9" />
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`Foto profil ${profile.full_name}`}
                  className="absolute inset-0 size-full object-cover"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-blue-600 uppercase">
                Akun pelanggan
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold text-slate-900 sm:text-2xl">
                {profile.full_name}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-500">
                {profile.email}
              </p>
            </div>
          </div>

          <Badge
            variant={profile.is_active ? "secondary" : "destructive"}
            className={
              profile.is_active
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : undefined
            }
          >
            {profile.is_active ? (
              <CheckCircle2Icon data-icon="inline-start" aria-hidden="true" />
            ) : (
              <CircleAlertIcon data-icon="inline-start" aria-hidden="true" />
            )}
            {profile.is_active ? "Aktif" : "Tidak aktif"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          <ProfileDetail icon={MailIcon} label="Email" value={profile.email} />
          <ProfileDetail
            icon={PhoneIcon}
            label="Nomor telepon"
            value={profile.phone}
          />
          <ProfileDetail
            icon={ShieldCheckIcon}
            label="Peran akun"
            value="Pelanggan"
          />
          <ProfileDetail
            icon={CalendarDaysIcon}
            label="Bergabung sejak"
            value={formatMemberSince(profile.created_at)}
          />
        </dl>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-1 sm:flex-1">
          <p className="font-medium text-slate-900">Keluar dari akun</p>
          <p className="text-xs leading-5 text-slate-500 sm:text-sm">
            Pastikan Anda keluar jika menggunakan perangkat bersama.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-10 w-full sm:w-auto"
          disabled={isLoggingOut}
          onClick={() => void logout()}
        >
          {isLoggingOut ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <LogOutIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </Button>
        {logoutError ? (
          <Alert
            variant="destructive"
            className="basis-full sm:order-last sm:w-full"
          >
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>Belum berhasil keluar</AlertTitle>
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export default function CustomerProfilePage() {
  const [profileState, setProfileState] = useState<ProfileState>({
    status: "loading",
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setProfileState({ status: "loading" });

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isActive) {
          return;
        }

        const email = user?.email?.trim();

        if (userError || !user || !email) {
          setProfileState({ status: "error" });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, phone, role, avatar_url, is_active, created_at",
          )
          .eq("id", user.id)
          .maybeSingle<CustomerProfileRow>();

        if (!isActive) {
          return;
        }

        if (
          profileError ||
          !profile ||
          profile.id !== user.id ||
          profile.role !== "CUSTOMER"
        ) {
          setProfileState({ status: "error" });
          return;
        }

        setProfileState({
          status: "ready",
          profile: {
            ...profile,
            email,
          },
        });
      } catch {
        if (isActive) {
          setProfileState({ status: "error" });
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [retryKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Akun pelanggan"
        title="Profil Saya"
        description="Lihat informasi akun yang terhubung dengan layanan A&W Laundry."
      />

      {profileState.status === "loading" ? <ProfileLoadingState /> : null}
      {profileState.status === "error" ? (
        <ProfileErrorState
          onRetry={() => setRetryKey((currentKey) => currentKey + 1)}
        />
      ) : null}
      {profileState.status === "ready" ? (
        <ProfileCard profile={profileState.profile} />
      ) : null}
    </div>
  );
}
