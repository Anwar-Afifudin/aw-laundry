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
  OrderPricingSummary,
  OrderReturnMethod,
} from "~/features/orders/types";
import { getBusinessSettings } from "~/features/settings/queries/get-business-settings";
import type { BusinessSettings } from "~/features/settings/types";
import { getActiveServices } from "~/features/services/queries/get-active-services";
import type {
  ActiveService,
  ServiceBillingUnit,
} from "~/features/services/types";
import { cn } from "~/lib/utils";

type ServicesState =
  | { status: "loading" }
  | { status: "ready"; services: ActiveService[] }
  | { status: "error" };

type BusinessSettingsState =
  | { status: "loading" }
  | { status: "ready"; settings: BusinessSettings }
  | { status: "error" };

type OrderSubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; title: string; message: string };

type OrderStep = 1 | 2 | 3 | 4;
type QuantityService = ActiveService;

type QuantityFieldConfig = {
  label: string;
  unit: "kg" | "pasang" | "pcs" | "m²";
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

const quantityFieldConfigs: Record<ServiceBillingUnit, QuantityFieldConfig> = {
  KG: {
    label: "Perkiraan berat",
    unit: "kg",
    min: 0.1,
    step: 0.1,
    inputMode: "decimal",
    placeholder: "3",
    helpText: "Gunakan kelipatan 0,1 kg.",
  },
  PAIR: {
    label: "Estimasi jumlah",
    unit: "pasang",
    min: 1,
    step: 1,
    inputMode: "numeric",
    placeholder: "2",
    helpText: "Masukkan jumlah pasang dalam bilangan bulat.",
  },
  PCS: {
    label: "Estimasi jumlah",
    unit: "pcs",
    min: 1,
    step: 1,
    inputMode: "numeric",
    placeholder: "2",
    helpText: "Masukkan jumlah pcs dalam bilangan bulat.",
  },
  M2: {
    label: "Estimasi luas",
    unit: "m²",
    min: 0.001,
    step: 0.001,
    inputMode: "decimal",
    placeholder: "2.5",
    helpText: "Masukkan luas dalam meter persegi.",
  },
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

const quantityFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const priceUnitLabels: Record<ServiceBillingUnit, string> = {
  KG: "/ kg",
  PAIR: "/ pasang",
  PCS: "/ pcs",
  M2: "/ m²",
};

function formatPrice(price: number) {
  return rupiahFormatter.format(price);
}

function formatDuration(hours: number) {
  return `± ${hours} jam`;
}

function validateEstimatedQuantity(
  rawQuantity: string,
  billingUnit: ServiceBillingUnit,
): QuantityValidation {
  const fieldLabel = quantityFieldConfigs[billingUnit].label;
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

  if (billingUnit === "PAIR" || billingUnit === "PCS") {
    if (quantity < 1) {
      return {
        value: null,
        error: `${fieldLabel} minimal 1.`,
      };
    }

    if (!Number.isSafeInteger(quantity)) {
      return {
        value: null,
        error: `${fieldLabel} harus berupa bilangan bulat.`,
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
  if (billingUnit === "KG" && Math.abs(quantityInTenths - Math.round(quantityInTenths)) > 1e-9) {
    return {
      value: null,
      error: "Perkiraan berat harus menggunakan kelipatan 0,1 kg.",
    };
  }

  return { value: quantity, error: null };
}

function formatQuantity(quantity: number, unit: QuantityFieldConfig["unit"]) {
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
        type="checkbox"
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
                  {priceUnitLabels[service.billing_unit]}
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

function ServicesErrorState({
  onRetry,
  settingsFailed = false,
}: {
  onRetry: () => void;
  settingsFailed?: boolean;
}) {
  return (
    <Card role="alert" className="shadow-sm">
      <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <CircleAlertIcon aria-hidden="true" className="size-6" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-slate-900">
          {settingsFailed ? "Pengaturan operasional belum dapat dimuat" : "Layanan belum dapat dimuat"}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          {settingsFailed
            ? "Pickup, delivery, biaya, dan minimum order belum dapat ditentukan. Periksa koneksi Anda, lalu coba lagi."
            : "Terjadi gangguan saat memuat daftar layanan. Periksa koneksi Anda, lalu coba lagi."}
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
  services,
  onContinue,
}: {
  services: ActiveService[];
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
          {services.length > 0 ? (
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{service.name}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{formatPrice(service.price)} {priceUnitLabels[service.billing_unit]}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Clock3Icon className="size-4" />{formatDuration(service.estimated_duration_hours)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center">
              <WashingMachineIcon
                aria-hidden="true"
                className="mx-auto size-6 text-slate-400"
              />
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pilih minimal satu layanan untuk melihat ringkasannya.
              </p>
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="h-11 w-full"
            disabled={services.length === 0}
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
  services,
  quantities,
}: {
  services: QuantityService[];
  quantities: Record<string, string>;
}) {
  const rows = services.map((service) => {
    const value = validateEstimatedQuantity(quantities[service.id] ?? "", service.billing_unit).value;
    return { service, value, subtotal: value === null ? null : service.price * value };
  });
  const total = rows.every((row) => row.subtotal !== null)
    ? rows.reduce((sum, row) => sum + (row.subtotal ?? 0), 0)
    : null;

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
          <div className="space-y-3">
            {rows.map(({ service, value, subtotal }) => <div key={service.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold">{service.name}</p><p className="mt-1 text-sm text-slate-600">{value === null ? "Belum diisi" : formatQuantity(value, quantityFieldConfigs[service.billing_unit].unit)}</p><p className="mt-2 font-bold text-blue-700">{subtotal === null ? "-" : formatPrice(subtotal)}</p></div>)}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-medium uppercase text-blue-700">Subtotal layanan</p><p className="mt-1 text-xl font-bold text-blue-800">{total === null ? "-" : formatPrice(total)}</p></div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function OrderDetailsStep({
  services,
  estimatedQuantities,
  notes,
  headingRef,
  onEstimatedQuantityChange,
  onNotesChange,
  onBack,
  onContinue,
  minimumOrder,
}: {
  services: QuantityService[];
  estimatedQuantities: Record<string, string>;
  notes: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEstimatedQuantityChange: (serviceId: string, quantity: string) => void;
  onNotesChange: (notes: string) => void;
  onBack: () => void;
  onContinue: () => void;
  minimumOrder: number;
}) {
  const [touchedServices, setTouchedServices] = useState<Set<string>>(new Set());
  const validations = services.map((service) => ({
    service,
    validation: validateEstimatedQuantity(estimatedQuantities[service.id] ?? "", service.billing_unit),
  }));
  const notesError =
    notes.length > 500 ? "Catatan laundry maksimal 500 karakter." : null;
  const total = validations.every(({ validation }) => validation.value !== null)
    ? validations.reduce(
        (sum, { service, validation }) => sum + service.price * validation.value!,
        0,
      )
    : null;
  const isFormValid =
    validations.every(({ validation }) => validation.value !== null) &&
    notesError === null &&
    total !== null &&
    total >= minimumOrder;
  const notesHelpId = "laundry-notes-help";
  const notesErrorId = "laundry-notes-error";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouchedServices(new Set(services.map((service) => service.id)));

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
            Lengkapi perkiraan untuk setiap layanan yang dipilih.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {minimumOrder > 0 ? (
            <div className={cn(
              "rounded-xl border p-4 text-sm leading-6",
              total !== null && total < minimumOrder
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-blue-200 bg-blue-50 text-blue-900",
            )}>
              {total !== null && total < minimumOrder
                ? `Minimum order adalah ${formatPrice(minimumOrder)}. Tambahkan layanan atau jumlah laundry sebelum melanjutkan.`
                : `Minimum order ${formatPrice(minimumOrder)}.`}
            </div>
          ) : null}
          <div className="space-y-4">
            {validations.map(({ service, validation }) => { const config = quantityFieldConfigs[service.billing_unit]; const inputId = `estimated-quantity-${service.id}`; const showError = validation.error !== null && (touchedServices.has(service.id) || Boolean(estimatedQuantities[service.id])); return <div key={service.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><p className="font-semibold text-slate-900">{service.name}</p><p className="mt-1 text-sm text-slate-500">{formatPrice(service.price)} {priceUnitLabels[service.billing_unit]}</p><Label htmlFor={inputId} className="mt-4">{config.label}<span className="text-red-600">*</span></Label><div className="relative mt-2"><Input id={inputId} type="number" min={config.min} step={config.step} inputMode={config.inputMode} placeholder={config.placeholder} value={estimatedQuantities[service.id] ?? ""} required aria-invalid={showError || undefined} className="h-11 pr-16" onChange={(event) => onEstimatedQuantityChange(service.id, event.target.value)} onBlur={() => setTouchedServices((current) => new Set(current).add(service.id))} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500">{config.unit}</span></div><p className="mt-2 text-xs text-slate-500">{config.helpText}</p>{showError && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{validation.error}</p>}</div>; })}
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
        services={services}
        quantities={estimatedQuantities}
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
  const [businessSettingsState, setBusinessSettingsState] =
    useState<BusinessSettingsState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [addressesState, setAddressesState] = useState<CustomerAddressesState>({
    status: "idle",
  });
  const [addressRetryKey, setAddressRetryKey] = useState(0);
  const [currentStep, setCurrentStep] = useState<OrderStep>(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [estimatedQuantities, setEstimatedQuantities] = useState<Record<string, string>>({});
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
    setBusinessSettingsState({ status: "loading" });
    setCurrentStep(1);
    setSelectedServiceIds([]);
    setEstimatedQuantities({});
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

    void getBusinessSettings()
      .then((settings) => {
        if (isActive) {
          setBusinessSettingsState({ status: "ready", settings });
        }
      })
      .catch(() => {
        if (isActive) {
          setBusinessSettingsState({ status: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [retryKey]);

  useEffect(() => {
    if (businessSettingsState.status !== "ready") return;

    if (!businessSettingsState.settings.pickup_enabled) {
      setIntakeMethod((current) => current === "PICKUP" ? null : current);
      setPickupAddressId(null);
    }
    if (!businessSettingsState.settings.delivery_enabled) {
      setReturnMethod((current) => current === "DELIVERY" ? null : current);
      setDeliveryAddressId(null);
    }
  }, [businessSettingsState]);

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
  const selectedServices = selectedServiceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is ActiveService => Boolean(service));
  const draftItems = selectedServices.map((service) => {
    const quantity = validateEstimatedQuantity(estimatedQuantities[service.id] ?? "", service.billing_unit).value;
    return { service, quantity, subtotal: quantity === null ? null : service.price * quantity };
  });
  const draftIsValid = draftItems.length > 0 && draftItems.every((item) => item.quantity !== null && item.subtotal !== null);
  const draftSubtotal = draftIsValid ? draftItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0) : null;
  const longestDuration = selectedServices.length > 0 ? Math.max(...selectedServices.map((service) => service.estimated_duration_hours)) : 0;
  const orderDraftSummary: OrderDraftSummary | null = draftIsValid && draftSubtotal !== null
    ? { items: draftItems.map(({ service, quantity, subtotal }) => ({ service: service.name, price: `${formatPrice(service.price)} ${priceUnitLabels[service.billing_unit]}`, quantity: formatQuantity(quantity!, quantityFieldConfigs[service.billing_unit].unit), subtotal: formatPrice(subtotal!) })), subtotal: formatPrice(draftSubtotal), duration: formatDuration(longestDuration) }
    : null;
  const businessSettings = businessSettingsState.status === "ready"
    ? businessSettingsState.settings
    : null;
  const pricing: OrderPricingSummary | null = draftSubtotal !== null && businessSettings
    ? {
        subtotal: draftSubtotal,
        pickupFee: intakeMethod === "PICKUP" ? businessSettings.pickup_fee : 0,
        deliveryFee: returnMethod === "DELIVERY" ? businessSettings.delivery_fee : 0,
        estimatedTotal:
          draftSubtotal
          + (intakeMethod === "PICKUP" ? businessSettings.pickup_fee : 0)
          + (returnMethod === "DELIVERY" ? businessSettings.delivery_fee : 0),
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
    setSelectedServiceIds((current) => current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]);
    setEstimatedQuantities((current) => { if (!(serviceId in current)) return current; const next = { ...current }; delete next[serviceId]; return next; });
    orderRequestIdRef.current = null;
  }

  function handleIntakeMethodChange(method: OrderIntakeMethod) {
    if (method === "PICKUP" && !businessSettings?.pickup_enabled) return;
    setIntakeMethod(method);

    if (method === "DROPOFF") {
      setPickupAddressId(null);
    }
  }

  function handleReturnMethodChange(method: OrderReturnMethod) {
    if (method === "DELIVERY" && !businessSettings?.delivery_enabled) return;
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

    if (selectedServices.length === 0) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: "Layanan yang dipilih tidak lagi tersedia pada pesanan ini.",
      });
      return;
    }

    if (!businessSettings) {
      setOrderSubmissionState({
        status: "error",
        title: "Pengaturan belum tersedia",
        message: "Pengaturan operasional belum dapat dimuat. Silakan coba lagi.",
      });
      return;
    }

    if (draftSubtotal === null) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: "Subtotal pesanan belum dapat dihitung. Periksa kembali layanan dan jumlah laundry.",
      });
      return;
    }

    if (draftSubtotal < businessSettings.minimum_order) {
      setOrderSubmissionState({
        status: "error",
        title: "Minimum order belum terpenuhi",
        message: `Minimum order adalah ${formatPrice(businessSettings.minimum_order)}. Tambahkan layanan atau jumlah laundry sebelum melanjutkan.`,
      });
      return;
    }

    const invalidItem = draftItems.find((item) => item.quantity === null || item.subtotal === null || !Number.isFinite(item.subtotal));
    if (invalidItem) {
      setOrderSubmissionState({
        status: "error",
        title: "Periksa kembali pesanan",
        message: validateEstimatedQuantity(estimatedQuantities[invalidItem.service.id] ?? "", invalidItem.service.billing_unit).error ?? "Perkiraan jumlah laundry belum dapat dihitung.",
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

    if (intakeMethod === "PICKUP" && !businessSettings.pickup_enabled) {
      setOrderSubmissionState({
        status: "error",
        title: "Pickup tidak tersedia",
        message: "Layanan pickup sedang tidak tersedia. Pilih antar sendiri untuk melanjutkan.",
      });
      return;
    }

    if (returnMethod === "DELIVERY" && !businessSettings.delivery_enabled) {
      setOrderSubmissionState({
        status: "error",
        title: "Delivery tidak tersedia",
        message: "Layanan delivery sedang tidak tersedia. Pilih ambil sendiri untuk melanjutkan.",
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
        items: draftItems.map(({ service, quantity }) => ({ serviceId: service.id, estimatedQuantity: quantity! })),
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

      {(servicesState.status === "loading" || businessSettingsState.status === "loading") && <ServiceSelectionSkeleton />}

      {(servicesState.status === "error" || businessSettingsState.status === "error") && (
        <ServicesErrorState
          settingsFailed={businessSettingsState.status === "error"}
          onRetry={() => setRetryKey((currentKey) => currentKey + 1)}
        />
      )}

      {servicesState.status === "ready" && businessSettings && services.length === 0 && (
        <PlaceholderCard
          icon={PackageOpenIcon}
          title="Belum ada layanan yang tersedia"
          description="Layanan laundry aktif akan ditampilkan di halaman ini. Silakan periksa kembali nanti."
        />
      )}

      {servicesState.status === "ready" && businessSettings &&
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
                Anda dapat memilih satu atau beberapa layanan dalam satu pesanan.
              </p>
            </div>

            <fieldset>
              <legend className="sr-only">Pilih layanan laundry</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedServiceIds.includes(service.id)}
                    onSelect={handleServiceSelection}
                  />
                ))}
              </div>
            </fieldset>
          </section>

          <SelectionSummary
            services={selectedServices}
            onContinue={() => {
              if (selectedServices.length > 0) {
                setCurrentStep(2);
              }
            }}
          />
        </div>
      )}

      {servicesState.status === "ready" && businessSettings &&
        currentStep === 2 &&
        selectedServices.length > 0 && (
          <OrderDetailsStep
            services={selectedServices}
            estimatedQuantities={estimatedQuantities}
            notes={notes}
            headingRef={stepHeadingRef}
            onEstimatedQuantityChange={(serviceId, quantity) => setEstimatedQuantities((current) => ({ ...current, [serviceId]: quantity }))}
            onNotesChange={setNotes}
            onBack={() => setCurrentStep(1)}
            onContinue={() => setCurrentStep(3)}
            minimumOrder={businessSettings.minimum_order}
          />
        )}

      {servicesState.status === "ready" && businessSettings &&
        currentStep === 3 &&
        orderDraftSummary && pricing && (
          <OrderShippingStep
            headingRef={stepHeadingRef}
            summary={orderDraftSummary}
            pricing={pricing}
            pickupEnabled={businessSettings.pickup_enabled}
            deliveryEnabled={businessSettings.delivery_enabled}
            pickupFee={businessSettings.pickup_fee}
            deliveryFee={businessSettings.delivery_fee}
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

      {servicesState.status === "ready" && businessSettings &&
        currentStep === 4 &&
        orderDraftSummary &&
        pricing &&
        intakeMethod &&
        returnMethod && (
          <OrderReviewStep
            headingRef={stepHeadingRef}
            summary={orderDraftSummary}
            pricing={pricing}
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
