import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  PackageOpenIcon,
  RefreshCwIcon,
  WashingMachineIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

import { PageHeader } from "~/components/shared/page-header";
import { PlaceholderCard } from "~/components/shared/placeholder-card";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { getCurrentCustomerAddresses } from "~/features/addresses/queries/get-current-customer-addresses";
import type {
  CustomerAddress,
  CustomerAddressesState,
} from "~/features/addresses/types";
import {
  OrderCreationSuccess,
  OrderReviewStep,
} from "~/features/orders/components/order-review-step";
import { OrderShippingStep } from "~/features/orders/components/order-shipping-step";
import {
  CreateCustomerOrderError,
  createCurrentCustomerOrder,
} from "~/features/orders/mutations/create-current-customer-order";
import type {
  CreatedCustomerOrder,
  OrderDraftSummary,
  OrderIntakeMethod,
  OrderReturnMethod,
} from "~/features/orders/types";
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

type OrderSubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; title: string; message: string };

type OrderStep = 1 | 2 | 3 | 4;
type QuantityPriceType = Extract<ServicePriceType, "PER_KG" | "PER_ITEM">;
type QuantityService = ActiveService & { price_type: QuantityPriceType };

type QuantityFieldConfig = {
  label: string;
  unit: "kg" | "item";
  min: number;
  step: number;
  inputMode: "decimal" | "numeric";
  placeholder: string;
  helpText: string;
};

type QuantityValidation = {
  value: number | null;
  error: string | null;
};

const orderSteps = [
  { number: 1, label: "Layanan" },
  { number: 2, label: "Detail Pesanan" },
  { number: 3, label: "Pengiriman" },
  { number: 4, label: "Ringkasan" },
] as const;

const stepDescriptions: Record<OrderStep, string> = {
  1: "Pilih satu layanan laundry yang paling sesuai dengan kebutuhan Anda.",
  2: "Lengkapi perkiraan jumlah laundry sebelum melanjutkan ke tahap pengiriman.",
  3: "Tentukan cara laundry diterima dan dikembalikan setelah selesai.",
  4: "Periksa kembali seluruh detail sebelum membuat pesanan.",
};

const quantityFieldConfigs: Record<QuantityPriceType, QuantityFieldConfig> = {
  PER_KG: {
    label: "Perkiraan berat",
    unit: "kg",
    min: 0.1,
    step: 0.1,
    inputMode: "decimal",
    placeholder: "3",
    helpText: "Gunakan kelipatan 0,1 kg.",
  },
  PER_ITEM: {
    label: "Jumlah item",
    unit: "item",
    min: 1,
    step: 1,
    inputMode: "numeric",
    placeholder: "2",
    helpText: "Masukkan jumlah item dalam bilangan bulat.",
  },
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

const quantityFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
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

function supportsOrderDetails(
  service: ActiveService,
): service is QuantityService {
  return service.price_type === "PER_KG" || service.price_type === "PER_ITEM";
}

function validateEstimatedQuantity(
  rawQuantity: string,
  priceType: QuantityPriceType,
): QuantityValidation {
  const fieldLabel =
    priceType === "PER_KG" ? "Perkiraan berat" : "Jumlah item";
  const trimmedQuantity = rawQuantity.trim();

  if (!trimmedQuantity) {
    return {
      value: null,
      error: `${fieldLabel} wajib diisi.`,
    };
  }

  const quantity = Number(trimmedQuantity);

  if (!Number.isFinite(quantity)) {
    return {
      value: null,
      error: `${fieldLabel} harus berupa angka yang valid.`,
    };
  }

  if (priceType === "PER_ITEM") {
    if (quantity < 1) {
      return {
        value: null,
        error: "Jumlah item minimal 1.",
      };
    }

    if (!Number.isSafeInteger(quantity)) {
      return {
        value: null,
        error: "Jumlah item harus berupa bilangan bulat.",
      };
    }

    return { value: quantity, error: null };
  }

  if (quantity <= 0) {
    return {
      value: null,
      error: "Perkiraan berat harus lebih dari 0 kg.",
    };
  }

  const quantityInTenths = quantity * 10;

  if (Math.abs(quantityInTenths - Math.round(quantityInTenths)) > 1e-9) {
    return {
      value: null,
      error: "Perkiraan berat harus menggunakan kelipatan 0,1 kg.",
    };
  }

  return { value: quantity, error: null };
}

function formatQuantity(quantity: number, unit: "kg" | "item") {
  return `${quantityFormatter.format(quantity)} ${unit}`;
}

function getOrderSubmissionError(error: unknown) {
  if (error instanceof CreateCustomerOrderError) {
    const errorTitles = {
      authentication: "Sesi perlu diperbarui",
      authorization: "Pesanan tidak dapat dibuat",
      validation: "Periksa kembali pesanan",
      service: "Layanan tidak tersedia",
      server: "Pesanan belum berhasil dibuat",
    } satisfies Record<typeof error.kind, string>;

    return {
      title: errorTitles[error.kind],
      message: error.message,
    };
  }

  return {
    title: "Pesanan belum berhasil dibuat",
    message: "Terjadi gangguan saat menyimpan pesanan. Silakan coba lagi.",
  };
}

function OrderStepIndicator({ currentStep }: { currentStep: OrderStep }) {
  return (
    <nav
      aria-label="Tahapan pembuatan pesanan"
      className="rounded-xl bg-white px-2 py-4 shadow-sm ring-1 ring-slate-200 sm:px-5"
    >
      <ol className="flex items-start">
        {orderSteps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isComplete = step.number < currentStep;

          return (
            <li
              key={step.number}
              aria-current={isActive ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center px-1 text-center"
            >
              {index < orderSteps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-4 left-[calc(50%+1rem)] h-0.5 w-[calc(100%-2rem)]",
                    isComplete ? "bg-blue-600" : "bg-slate-200",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full border text-xs font-bold",
                  isActive && "border-blue-600 bg-blue-600 text-white",
                  isComplete && "border-blue-600 bg-blue-50 text-blue-700",
                  !isActive &&
                    !isComplete &&
                    "border-slate-200 bg-slate-100 text-slate-500",
                )}
              >
                {isComplete ? (
                  <CheckIcon aria-hidden="true" className="size-4" />
                ) : (
                  step.number
                )}
              </span>
              <span
                className={cn(
                  "mt-2 text-[0.6875rem] leading-4 font-medium sm:text-xs",
                  isActive || isComplete
                    ? "text-slate-900"
                    : "text-slate-500",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
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
  onContinue,
}: {
  service: ActiveService | null;
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
            disabled={!service || !supportsOrderDetails(service)}
            onClick={onContinue}
          >
            Lanjutkan
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function OrderDetailsSummary({
  service,
  quantity,
  estimatedSubtotal,
}: {
  service: QuantityService;
  quantity: number | null;
  estimatedSubtotal: number | null;
}) {
  const quantityConfig = quantityFieldConfigs[service.price_type];

  return (
    <aside aria-label="Ringkasan detail pesanan" className="lg:sticky lg:top-24">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Ringkasan pesanan
          </CardTitle>
          <CardDescription>
            Estimasi diperbarui dari detail yang Anda isi.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                Perkiraan
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {quantity === null
                  ? "-"
                  : formatQuantity(quantity, quantityConfig.unit)}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-medium text-slate-500">
                Estimasi subtotal
              </dt>
              <dd className="mt-1 text-lg font-bold text-blue-700">
                {estimatedSubtotal === null
                  ? "-"
                  : formatPrice(estimatedSubtotal)}
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
        </CardContent>
      </Card>
    </aside>
  );
}

function OrderDetailsStep({
  service,
  estimatedQuantity,
  notes,
  headingRef,
  onEstimatedQuantityChange,
  onNotesChange,
  onBack,
  onContinue,
}: {
  service: QuantityService;
  estimatedQuantity: string;
  notes: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEstimatedQuantityChange: (quantity: string) => void;
  onNotesChange: (notes: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [quantityTouched, setQuantityTouched] = useState(false);
  const quantityConfig = quantityFieldConfigs[service.price_type];
  const quantityValidation = validateEstimatedQuantity(
    estimatedQuantity,
    service.price_type,
  );
  const notesError =
    notes.length > 500 ? "Catatan laundry maksimal 500 karakter." : null;
  const showQuantityError =
    quantityValidation.error !== null &&
    (quantityTouched || estimatedQuantity !== "");
  const calculatedSubtotal =
    quantityValidation.value === null
      ? null
      : service.price * quantityValidation.value;
  const estimatedSubtotal =
    calculatedSubtotal !== null && Number.isFinite(calculatedSubtotal)
      ? calculatedSubtotal
      : null;
  const isFormValid =
    quantityValidation.value !== null &&
    estimatedSubtotal !== null &&
    notesError === null;
  const quantityHelpId = "estimated-quantity-help";
  const quantityErrorId = "estimated-quantity-error";
  const notesHelpId = "laundry-notes-help";
  const notesErrorId = "laundry-notes-error";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuantityTouched(true);

    if (!isFormValid) {
      return;
    }

    onContinue();
  }

  return (
    <form
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      onSubmit={handleSubmit}
    >
      <Card className="shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-lg font-semibold text-slate-900 focus:outline-none"
          >
            Detail pesanan
          </h2>
          <CardDescription>
            Lengkapi perkiraan untuk layanan {service.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="estimated-quantity">
              {quantityConfig.label}
              <span aria-hidden="true" className="text-red-600">
                *
              </span>
            </Label>
            <div className="relative mt-2">
              <Input
                id="estimated-quantity"
                type="number"
                min={quantityConfig.min}
                step={quantityConfig.step}
                inputMode={quantityConfig.inputMode}
                placeholder={quantityConfig.placeholder}
                value={estimatedQuantity}
                required
                aria-invalid={showQuantityError || undefined}
                aria-describedby={`${quantityHelpId}${
                  showQuantityError ? ` ${quantityErrorId}` : ""
                }`}
                className="h-11 pr-14"
                onChange={(event) =>
                  onEstimatedQuantityChange(event.target.value)
                }
                onBlur={() => setQuantityTouched(true)}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500"
              >
                {quantityConfig.unit}
              </span>
            </div>
            <p id={quantityHelpId} className="mt-2 text-xs text-slate-500">
              {quantityConfig.helpText}
            </p>
            {showQuantityError && (
              <p
                id={quantityErrorId}
                role="alert"
                className="mt-2 text-sm font-medium text-red-600"
              >
                {quantityValidation.error}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="laundry-notes">
              Catatan laundry
              <span className="font-normal text-slate-500">(Opsional)</span>
            </Label>
            <Textarea
              id="laundry-notes"
              value={notes}
              maxLength={500}
              rows={5}
              placeholder="Contoh: Pisahkan pakaian berwarna."
              aria-invalid={notesError !== null || undefined}
              aria-describedby={`${notesHelpId}${
                notesError ? ` ${notesErrorId}` : ""
              }`}
              className="mt-2 min-h-28 resize-y"
              onChange={(event) => onNotesChange(event.target.value)}
            />
            <p
              id={notesHelpId}
              className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500"
            >
              <span>Maksimal 500 karakter.</span>
              <span>{notes.length}/500 karakter</span>
            </p>
            {notesError && (
              <p
                id={notesErrorId}
                role="alert"
                className="mt-2 text-sm font-medium text-red-600"
              >
                {notesError}
              </p>
            )}
          </div>

          <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full"
              onClick={onBack}
            >
              <ArrowLeftIcon aria-hidden="true" />
              Kembali
            </Button>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={!isFormValid}
            >
              Lanjutkan
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <OrderDetailsSummary
        service={service}
        quantity={quantityValidation.value}
        estimatedSubtotal={estimatedSubtotal}
      />
    </form>
  );
}

export function meta() {
  return [{ title: "Buat Pesanan | A&W Laundry" }];
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [servicesState, setServicesState] = useState<ServicesState>({
    status: "loading",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [addressesState, setAddressesState] = useState<CustomerAddressesState>({
    status: "idle",
  });
  const [addressRetryKey, setAddressRetryKey] = useState(0);
  const [currentStep, setCurrentStep] = useState<OrderStep>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [estimatedQuantity, setEstimatedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [intakeMethod, setIntakeMethod] =
    useState<OrderIntakeMethod | null>(null);
  const [pickupAddressId, setPickupAddressId] = useState<string | null>(null);
  const [returnMethod, setReturnMethod] =
    useState<OrderReturnMethod | null>(null);
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(
    null,
  );
  const [orderSubmissionState, setOrderSubmissionState] =
    useState<OrderSubmissionState>({ status: "idle" });
  const [createdOrder, setCreatedOrder] =
    useState<CreatedCustomerOrder | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const addressesLoadedRef = useRef(false);
  const orderSubmissionLockRef = useRef(false);
  const orderRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;

    setServicesState({ status: "loading" });
    setCurrentStep(1);
    setSelectedServiceId(null);
    setEstimatedQuantity("");
    setNotes("");
    setIntakeMethod(null);
    setPickupAddressId(null);
    setReturnMethod(null);
    setDeliveryAddressId(null);
    setAddressesState({ status: "idle" });
    setOrderSubmissionState({ status: "idle" });
    setCreatedOrder(null);
    addressesLoadedRef.current = false;
    orderSubmissionLockRef.current = false;
    orderRequestIdRef.current = null;

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

  useEffect(() => {
    if (currentStep !== 3 || addressesLoadedRef.current) {
      return;
    }

    let isActive = true;

    setAddressesState({ status: "loading" });

    void getCurrentCustomerAddresses()
      .then((addresses) => {
        if (!isActive) {
          return;
        }

        const addressIds = new Set(addresses.map((address) => address.id));

        setPickupAddressId((currentAddressId) =>
          currentAddressId && addressIds.has(currentAddressId)
            ? currentAddressId
            : null,
        );
        setDeliveryAddressId((currentAddressId) =>
          currentAddressId && addressIds.has(currentAddressId)
            ? currentAddressId
            : null,
        );
        addressesLoadedRef.current = true;
        setAddressesState({ status: "ready", addresses });
      })
      .catch(() => {
        if (isActive) {
          setAddressesState({ status: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [addressRetryKey, currentStep]);

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [createdOrder, currentStep]);

  const services =
    servicesState.status === "ready" ? servicesState.services : [];
  const selectedService =
    services.find((service) => service.id === selectedServiceId) ?? null;
  const detailsService =
    selectedService && supportsOrderDetails(selectedService)
      ? selectedService
      : null;
  const detailQuantityValidation = detailsService
    ? validateEstimatedQuantity(estimatedQuantity, detailsService.price_type)
    : null;
  const detailQuantity = detailQuantityValidation?.value ?? null;
  const calculatedDraftSubtotal =
    detailsService && detailQuantity !== null
      ? detailsService.price * detailQuantity
      : null;
  const draftSubtotal =
    calculatedDraftSubtotal !== null &&
    Number.isFinite(calculatedDraftSubtotal)
      ? calculatedDraftSubtotal
      : null;
  const orderDraftSummary: OrderDraftSummary | null =
    detailsService && detailQuantity !== null && draftSubtotal !== null
      ? {
          service: detailsService.name,
          price: `${formatPrice(detailsService.price)} ${
            priceUnitLabels[detailsService.price_type]
          }`,
          quantity: formatQuantity(
            detailQuantity,
            quantityFieldConfigs[detailsService.price_type].unit,
          ),
          subtotal: formatPrice(draftSubtotal),
          duration: formatDuration(detailsService.estimated_duration_hours),
        }
      : null;
  const addresses =
    addressesState.status === "ready" ? addressesState.addresses : [];
  const selectedPickupAddress =
    intakeMethod === "PICKUP"
      ? (addresses.find((address) => address.id === pickupAddressId) ?? null)
      : null;
  const selectedDeliveryAddress =
    returnMethod === "DELIVERY"
      ? (addresses.find((address) => address.id === deliveryAddressId) ?? null)
      : null;

  function handleServiceSelection(serviceId: string) {
    if (serviceId !== selectedServiceId) {
      setEstimatedQuantity("");
      setNotes("");
      setIntakeMethod(null);
      setPickupAddressId(null);
      setReturnMethod(null);
      setDeliveryAddressId(null);
      setAddressesState({ status: "idle" });
      addressesLoadedRef.current = false;
    }

    setSelectedServiceId(serviceId);
  }

  function handleIntakeMethodChange(method: OrderIntakeMethod) {
    setIntakeMethod(method);

    if (method === "DROPOFF") {
      setPickupAddressId(null);
    }
  }

  function handleReturnMethodChange(method: OrderReturnMethod) {
    setReturnMethod(method);

    if (method === "CUSTOMER_PICKUP") {
      setDeliveryAddressId(null);
    }
  }

  function handleRetryAddresses() {
    addressesLoadedRef.current = false;
    setAddressRetryKey((currentKey) => currentKey + 1);
  }

  async function handleAddressCreated(address: CustomerAddress) {
    const includeCreatedAddress = (currentAddresses: CustomerAddress[]) => [
      address,
      ...currentAddresses.filter(
        (currentAddress) => currentAddress.id !== address.id,
      ),
    ];

    addressesLoadedRef.current = true;
    setAddressesState((currentState) => ({
      status: "ready",
      addresses: includeCreatedAddress(
        currentState.status === "ready" ? currentState.addresses : [],
      ),
    }));

    setPickupAddressId(address.id);
    setDeliveryAddressId(address.id);

    try {
      const refreshedAddresses = await getCurrentCustomerAddresses();
      const includesCreatedAddress = refreshedAddresses.some(
        (currentAddress) => currentAddress.id === address.id,
      );

      setAddressesState({
        status: "ready",
        addresses: includesCreatedAddress
          ? refreshedAddresses
          : includeCreatedAddress(refreshedAddresses),
      });
    } catch {
      // Keep the successfully inserted address available in local state when
      // the follow-up refresh is interrupted.
    }
  }

  async function handleCreateOrder() {
    if (orderSubmissionLockRef.current) {
      return;
    }

    if (!detailsService) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: "Layanan yang dipilih tidak lagi tersedia pada pesanan ini.",
      });
      return;
    }

    const quantityValidation = validateEstimatedQuantity(
      estimatedQuantity,
      detailsService.price_type,
    );
    const quantity = quantityValidation.value;
    const calculatedSubtotal =
      quantity === null ? null : detailsService.price * quantity;

    if (
      quantity === null ||
      calculatedSubtotal === null ||
      !Number.isFinite(calculatedSubtotal) ||
      calculatedSubtotal < 0
    ) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message:
          quantityValidation.error ??
          "Perkiraan jumlah laundry belum dapat dihitung.",
      });
      return;
    }

    if (notes.length > 500) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: "Catatan laundry maksimal 500 karakter.",
      });
      return;
    }

    if (!intakeMethod || !returnMethod) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: "Metode pengambilan dan pengembalian wajib dipilih.",
      });
      return;
    }

    if (intakeMethod === "PICKUP" && !selectedPickupAddress) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: "Pilih alamat pengambilan sebelum membuat pesanan.",
      });
      return;
    }

    if (returnMethod === "DELIVERY" && !selectedDeliveryAddress) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: "Pilih alamat pengantaran sebelum membuat pesanan.",
      });
      return;
    }

    try {
      orderRequestIdRef.current ??= globalThis.crypto.randomUUID();
    } catch {
      setOrderSubmissionState({
        status: "error",
        title: "Pesanan belum berhasil dibuat",
        message:
          "Perangkat belum dapat menyiapkan pesanan dengan aman. Muat ulang halaman lalu coba lagi.",
      });
      return;
    }

    orderSubmissionLockRef.current = true;
    setOrderSubmissionState({ status: "submitting" });

    try {
      const order = await createCurrentCustomerOrder({
        orderId: orderRequestIdRef.current,
        serviceId: detailsService.id,
        estimatedQuantity: quantity,
        specialInstructions: notes.trim() || null,
        intakeMethod,
        returnMethod,
        pickupAddressId:
          intakeMethod === "PICKUP" ? selectedPickupAddress?.id ?? null : null,
        deliveryAddressId:
          returnMethod === "DELIVERY"
            ? selectedDeliveryAddress?.id ?? null
            : null,
      });

      setCreatedOrder(order);
      setOrderSubmissionState({ status: "idle" });
    } catch (error) {
      orderSubmissionLockRef.current = false;
      setOrderSubmissionState({
        status: "error",
        ...getOrderSubmissionError(error),
      });
    }
  }

  if (createdOrder) {
    return (
      <OrderCreationSuccess
        order={createdOrder}
        headingRef={stepHeadingRef}
        onViewOrders={() => void navigate("/app/orders", { replace: true })}
        onBackHome={() => void navigate("/app", { replace: true })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aplikasi pelanggan"
        title="Buat Pesanan"
        description={stepDescriptions[currentStep]}
      />

      <OrderStepIndicator currentStep={currentStep} />

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

      {servicesState.status === "ready" &&
        services.length > 0 &&
        currentStep === 1 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section aria-labelledby="service-list-title">
            <div className="mb-4">
              <h2
                ref={stepHeadingRef}
                id="service-list-title"
                tabIndex={-1}
                className="font-heading text-lg font-semibold text-slate-900 focus:outline-none"
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
            onContinue={() => {
              if (detailsService) {
                setCurrentStep(2);
              }
            }}
          />
        </div>
      )}

      {servicesState.status === "ready" &&
        currentStep === 2 &&
        detailsService && (
          <OrderDetailsStep
            service={detailsService}
            estimatedQuantity={estimatedQuantity}
            notes={notes}
            headingRef={stepHeadingRef}
            onEstimatedQuantityChange={setEstimatedQuantity}
            onNotesChange={setNotes}
            onBack={() => setCurrentStep(1)}
            onContinue={() => setCurrentStep(3)}
          />
        )}

      {servicesState.status === "ready" &&
        currentStep === 3 &&
        orderDraftSummary && (
          <OrderShippingStep
            headingRef={stepHeadingRef}
            summary={orderDraftSummary}
            addressesState={addressesState}
            intakeMethod={intakeMethod}
            pickupAddressId={pickupAddressId}
            returnMethod={returnMethod}
            deliveryAddressId={deliveryAddressId}
            onIntakeMethodChange={handleIntakeMethodChange}
            onPickupAddressChange={setPickupAddressId}
            onReturnMethodChange={handleReturnMethodChange}
            onDeliveryAddressChange={setDeliveryAddressId}
            onRetryAddresses={handleRetryAddresses}
            onAddressCreated={handleAddressCreated}
            onBack={() => setCurrentStep(2)}
            onContinue={() => {
              setOrderSubmissionState({ status: "idle" });
              setCurrentStep(4);
            }}
          />
        )}

      {servicesState.status === "ready" &&
        currentStep === 4 &&
        orderDraftSummary &&
        intakeMethod &&
        returnMethod && (
          <OrderReviewStep
            headingRef={stepHeadingRef}
            summary={orderDraftSummary}
            notes={notes}
            intakeMethod={intakeMethod}
            returnMethod={returnMethod}
            pickupAddress={selectedPickupAddress}
            deliveryAddress={selectedDeliveryAddress}
            isSubmitting={orderSubmissionState.status === "submitting"}
            error={
              orderSubmissionState.status === "error"
                ? {
                    title: orderSubmissionState.title,
                    message: orderSubmissionState.message,
                  }
                : null
            }
            onBack={() => {
              setOrderSubmissionState({ status: "idle" });
              setCurrentStep(3);
            }}
            onCreateOrder={() => void handleCreateOrder()}
          />
        )}
    </div>
  );
}
