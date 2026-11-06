import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  InfoIcon,
  PackageOpenIcon,
  RefreshCwIcon,
  WashingMachineIcon,
} from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { getActiveServices } from "~/features/services/queries/get-active-services";
import type {
  ActiveService,
  ServicePriceType,
} from "~/features/services/types";
import { cn } from "~/lib/utils";

type ServicesState =
  | { status: "loading" }
  | { status: "ready"; services: ActiveService[] }
  | { status: "error" };

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

const priceUnitLabels: Record<ServicePriceType, string> = {
  PER_KG: "/ kg",
  PER_ITEM: "/ item",
  PER_METER: "/ meter",
  FIXED: "harga tetap",
};

function formatPrice(price: number) {
  return rupiahFormatter.format(price);
}

function formatDuration(hours: number) {
  return `± ${hours} jam`;
}

function ServiceVisual({ service }: { service: ActiveService }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(service.image_url) && !imageFailed;

  return (
    <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100">
      {showImage ? (
        <img
          src={service.image_url ?? undefined}
          alt={`Ilustrasi layanan ${service.name}`}
          className="size-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex size-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
          <WashingMachineIcon aria-hidden="true" className="size-8" />
        </span>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  isSelected,
  onSelect,
}: {
  service: ActiveService;
  isSelected: boolean;
  onSelect: (serviceId: string) => void;
}) {
  const inputId = `service-${service.id}`;
  const titleId = `${inputId}-title`;
  const detailsId = `${inputId}-details`;

  return (
    <div className="relative h-full">
      <input
        id={inputId}
        type="radio"
        name="laundry-service"
        value={service.id}
        checked={isSelected}
        aria-labelledby={titleId}
        aria-describedby={detailsId}
        className="peer sr-only focus-visible:outline-none"
        onChange={() => onSelect(service.id)}
      />
      <label
        htmlFor={inputId}
        className="block h-full rounded-xl peer-focus-visible:ring-3 peer-focus-visible:ring-blue-600/30"
      >
        <Card
          className={cn(
            "h-full gap-0 py-0 shadow-sm transition-[box-shadow,background-color] hover:shadow-md",
            isSelected
              ? "bg-blue-50/40 ring-2 ring-blue-600"
              : "ring-slate-200 hover:ring-blue-300",
          )}
        >
          <div className="relative">
            <ServiceVisual service={service} />
            {isSelected && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                <CheckCircle2Icon aria-hidden="true" className="size-3.5" />
                Dipilih
              </span>
            )}
          </div>

          <CardContent className="flex flex-1 flex-col p-4">
            <CardTitle
              id={titleId}
              className="text-base font-semibold text-slate-900"
            >
              {service.name}
            </CardTitle>
            {service.description && (
              <CardDescription className="mt-1.5 leading-5">
                {service.description}
              </CardDescription>
            )}

            <div id={detailsId} className="mt-auto pt-5">
              <p className="flex flex-wrap items-baseline gap-x-1.5 text-slate-600">
                <span className="text-lg font-bold text-blue-700">
                  {formatPrice(service.price)}
                </span>
                <span className="text-xs font-medium">
                  {priceUnitLabels[service.price_type]}
                </span>
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Clock3Icon aria-hidden="true" className="size-4" />
                Estimasi {formatDuration(service.estimated_duration_hours)}
              </p>
            </div>
          </CardContent>
        </Card>
      </label>
    </div>
  );
}

function ServiceSelectionSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      aria-busy="true"
      aria-label="Memuat layanan"
    >
      <span className="sr-only" role="status" aria-live="polite">
        Daftar layanan sedang dimuat.
      </span>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="gap-0 py-0 shadow-sm">
            <Skeleton className="h-36 w-full rounded-none" />
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-3/5" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ServicesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card role="alert" className="shadow-sm">
      <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <CircleAlertIcon aria-hidden="true" className="size-6" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-slate-900">
          Layanan belum dapat dimuat
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Terjadi gangguan saat memuat daftar layanan. Periksa koneksi Anda,
          lalu coba lagi.
        </p>
        <Button type="button" size="lg" className="mt-6 h-11" onClick={onRetry}>
          <RefreshCwIcon aria-hidden="true" />
          Coba lagi
        </Button>
      </CardContent>
    </Card>
  );
}

function SelectionSummary({
  service,
  showNextStepMessage,
  onContinue,
}: {
  service: ActiveService | null;
  showNextStepMessage: boolean;
  onContinue: () => void;
}) {
  return (
    <aside aria-label="Ringkasan layanan" className="lg:sticky lg:top-24">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Ringkasan pilihan
          </CardTitle>
          <CardDescription>
            Pastikan layanan yang dipilih sudah sesuai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {service ? (
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-4">
              <div className="py-3">
                <dt className="text-xs font-medium text-slate-500">Layanan</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {service.name}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-xs font-medium text-slate-500">Harga</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {formatPrice(service.price)}{" "}
                  <span className="text-sm font-medium text-slate-500">
                    {priceUnitLabels[service.price_type]}
                  </span>
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-xs font-medium text-slate-500">
                  Estimasi durasi
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900">
                  <Clock3Icon
                    aria-hidden="true"
                    className="size-4 text-blue-600"
                  />
                  {formatDuration(service.estimated_duration_hours)}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center">
              <WashingMachineIcon
                aria-hidden="true"
                className="mx-auto size-6 text-slate-400"
              />
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pilih satu layanan untuk melihat ringkasannya.
              </p>
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="h-11 w-full"
            disabled={!service}
            onClick={onContinue}
          >
            Lanjutkan
            <ArrowRightIcon aria-hidden="true" />
          </Button>

          {showNextStepMessage && service && (
            <Alert
              role="status"
              className="border-blue-200 bg-blue-50 text-blue-900"
            >
              <InfoIcon aria-hidden="true" />
              <AlertTitle>Langkah berikutnya</AlertTitle>
              <AlertDescription className="text-blue-800">
                Detail pesanan akan dilengkapi pada tahap berikutnya.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

export function meta() {
  return [{ title: "Buat Pesanan | A&W Laundry" }];
}

export default function NewOrderPage() {
  const [servicesState, setServicesState] = useState<ServicesState>({
    status: "loading",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [showNextStepMessage, setShowNextStepMessage] = useState(false);

  useEffect(() => {
    let isActive = true;

    setServicesState({ status: "loading" });
    setSelectedServiceId(null);
    setShowNextStepMessage(false);

    void getActiveServices()
      .then((services) => {
        if (isActive) {
          setServicesState({ status: "ready", services });
        }
      })
      .catch(() => {
        if (isActive) {
          setServicesState({ status: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [retryKey]);

  const services =
    servicesState.status === "ready" ? servicesState.services : [];
  const selectedService =
    services.find((service) => service.id === selectedServiceId) ?? null;

  function handleServiceSelection(serviceId: string) {
    setSelectedServiceId(serviceId);
    setShowNextStepMessage(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aplikasi pelanggan"
        title="Buat Pesanan"
        description="Pilih satu layanan laundry yang paling sesuai dengan kebutuhan Anda."
      />

      {servicesState.status === "loading" && <ServiceSelectionSkeleton />}

      {servicesState.status === "error" && (
        <ServicesErrorState
          onRetry={() => setRetryKey((currentKey) => currentKey + 1)}
        />
      )}

      {servicesState.status === "ready" && services.length === 0 && (
        <PlaceholderCard
          icon={PackageOpenIcon}
          title="Belum ada layanan yang tersedia"
          description="Layanan laundry aktif akan ditampilkan di halaman ini. Silakan periksa kembali nanti."
        />
      )}

      {servicesState.status === "ready" && services.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section aria-labelledby="service-list-title">
            <div className="mb-4">
              <h2
                id="service-list-title"
                className="font-heading text-lg font-semibold text-slate-900"
              >
                Pilih layanan
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Anda dapat memilih satu layanan untuk pesanan ini.
              </p>
            </div>

            <fieldset>
              <legend className="sr-only">Pilih satu layanan laundry</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedServiceId === service.id}
                    onSelect={handleServiceSelection}
                  />
                ))}
              </div>
            </fieldset>
          </section>

          <SelectionSummary
            service={selectedService}
            showNextStepMessage={showNextStepMessage}
            onContinue={() => {
              if (selectedService) {
                setShowNextStepMessage(true);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
