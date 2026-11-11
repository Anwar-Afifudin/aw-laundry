import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  StoreIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react";
import {
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";

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
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { CreateAddressDialog } from "~/features/addresses/components/create-address-dialog";
import type {
  CustomerAddress,
  CustomerAddressesState,
} from "~/features/addresses/types";
import type {
  OrderDraftSummary,
  OrderIntakeMethod,
  OrderReturnMethod,
} from "~/features/orders/types";
import { cn } from "~/lib/utils";

type MethodOption<TMethod extends string> = {
  value: TMethod;
  label: string;
  description: string;
  icon: LucideIcon;
};

const intakeMethodOptions = [
  {
    value: "PICKUP",
    label: "Dijemput A&W Laundry",
    description: "Kurir mengambil laundry dari alamat Anda.",
    icon: TruckIcon,
  },
  {
    value: "DROPOFF",
    label: "Antar sendiri",
    description: "Anda mengantar laundry langsung ke A&W Laundry.",
    icon: StoreIcon,
  },
] satisfies readonly MethodOption<OrderIntakeMethod>[];

const returnMethodOptions = [
  {
    value: "DELIVERY",
    label: "Diantar ke alamat",
    description: "Laundry yang sudah selesai diantar kembali ke alamat Anda.",
    icon: TruckIcon,
  },
  {
    value: "CUSTOMER_PICKUP",
    label: "Ambil sendiri",
    description: "Anda mengambil laundry yang sudah selesai di A&W Laundry.",
    icon: StoreIcon,
  },
] satisfies readonly MethodOption<OrderReturnMethod>[];

const intakeMethodLabels: Record<OrderIntakeMethod, string> = {
  PICKUP: "Dijemput A&W Laundry",
  DROPOFF: "Antar sendiri",
};

const returnMethodLabels: Record<OrderReturnMethod, string> = {
  DELIVERY: "Diantar ke alamat",
  CUSTOMER_PICKUP: "Ambil sendiri",
};

function MethodSelector<TMethod extends string>({
  legend,
  helperText,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  helperText: string;
  name: string;
  value: TMethod | null;
  options: readonly MethodOption<TMethod>[];
  onChange: (method: TMethod) => void;
}) {
  const helperId = `${name}-help`;

  return (
    <fieldset aria-describedby={helperId}>
      <legend className="text-base font-semibold text-slate-900">
        {legend}
        <span aria-hidden="true" className="ml-1 text-red-600">
          *
        </span>
      </legend>
      <p id={helperId} className="mt-1 text-sm leading-6 text-slate-600">
        {helperText}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const inputId = `${name}-${option.value.toLowerCase()}`;
          const titleId = `${inputId}-title`;
          const descriptionId = `${inputId}-description`;
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <div key={option.value} className="relative">
              <input
                id={inputId}
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                required
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="peer sr-only focus-visible:outline-none"
                onChange={() => onChange(option.value)}
              />
              <label
                htmlFor={inputId}
                className={cn(
                  "flex h-full min-h-28 cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-[border-color,box-shadow,background-color]",
                  "peer-focus-visible:ring-3 peer-focus-visible:ring-blue-600/30",
                  isSelected
                    ? "border-blue-600 bg-blue-50/60 shadow-sm"
                    : "border-slate-200 hover:border-blue-300",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span
                      id={titleId}
                      className="font-semibold text-slate-900"
                    >
                      {option.label}
                    </span>
                    {isSelected ? (
                      <CheckCircle2Icon
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-blue-600"
                      />
                    ) : null}
                  </span>
                  <span
                    id={descriptionId}
                    className="mt-1 block text-sm leading-5 text-slate-600"
                  >
                    {option.description}
                  </span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function formatAddressLocation(address: CustomerAddress) {
  const location = [address.district, address.city, address.postal_code].filter(
    (part): part is string => Boolean(part?.trim()),
  );

  return location.length > 0 ? location.join(", ") : null;
}

function AddressChoice({
  address,
  groupName,
  selectedAddressId,
  onSelect,
}: {
  address: CustomerAddress;
  groupName: string;
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
}) {
  const inputId = `${groupName}-${address.id}`;
  const titleId = `${inputId}-title`;
  const detailsId = `${inputId}-details`;
  const isSelected = selectedAddressId === address.id;
  const location = formatAddressLocation(address);

  return (
    <div className="relative">
      <input
        id={inputId}
        type="radio"
        name={groupName}
        value={address.id}
        checked={isSelected}
        required
        aria-labelledby={titleId}
        aria-describedby={detailsId}
        className="peer sr-only focus-visible:outline-none"
        onChange={() => onSelect(address.id)}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "block cursor-pointer rounded-xl border bg-white p-4 transition-[border-color,box-shadow,background-color]",
          "peer-focus-visible:ring-3 peer-focus-visible:ring-blue-600/30",
          isSelected
            ? "border-blue-600 bg-blue-50/60 shadow-sm"
            : "border-slate-200 hover:border-blue-300",
        )}
      >
        <span className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              isSelected
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            <MapPinIcon aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span id={titleId} className="font-semibold text-slate-900">
                {address.label}
              </span>
              {address.is_default ? (
                <Badge
                  variant="secondary"
                  className="border border-blue-200 bg-blue-50 text-blue-700"
                >
                  Utama
                </Badge>
              ) : null}
            </span>
            <span
              id={detailsId}
              className="mt-2 block space-y-1 text-sm leading-5 text-slate-600"
            >
              <span className="block font-medium text-slate-800">
                {address.recipient_name}
              </span>
              <span className="flex items-center gap-1.5">
                <PhoneIcon aria-hidden="true" className="size-3.5" />
                {address.phone}
              </span>
              <span className="block break-words">{address.address_line}</span>
              {location ? <span className="block">{location}</span> : null}
              {address.notes ? (
                <span className="block text-xs text-slate-500">
                  Catatan: {address.notes}
                </span>
              ) : null}
            </span>
          </span>
          {isSelected ? (
            <CheckCircle2Icon
              aria-hidden="true"
              className="size-5 shrink-0 text-blue-600"
            />
          ) : null}
        </span>
      </label>
    </div>
  );
}

function AddressSelectionGroup({
  legend,
  helperText,
  groupName,
  addresses,
  selectedAddressId,
  onSelect,
}: {
  legend: string;
  helperText: string;
  groupName: string;
  addresses: CustomerAddress[];
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
}) {
  const helperId = `${groupName}-help`;

  return (
    <fieldset aria-describedby={helperId}>
      <legend className="text-sm font-semibold text-slate-900">
        {legend}
        <span aria-hidden="true" className="ml-1 text-red-600">
          *
        </span>
      </legend>
      <p id={helperId} className="mt-1 text-sm leading-5 text-slate-600">
        {helperText}
      </p>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {addresses.map((address) => (
          <AddressChoice
            key={address.id}
            address={address}
            groupName={groupName}
            selectedAddressId={selectedAddressId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </fieldset>
  );
}

function AddressLoadingState() {
  return (
    <div aria-busy="true" aria-label="Memuat alamat tersimpan">
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-slate-200 p-4"
          >
            <div className="flex gap-3">
              <Skeleton className="size-9 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36 max-w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        Memuat alamat Anda...
      </p>
    </div>
  );
}

function AddressErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="p-4">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>Alamat belum dapat dimuat</AlertTitle>
        <AlertDescription className="leading-6">
          Terjadi gangguan saat memuat alamat tersimpan. Periksa koneksi lalu
          coba lagi.
        </AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={onRetry}>
        <RefreshCwIcon aria-hidden="true" />
        Coba lagi
      </Button>
    </div>
  );
}

function AddressEmptyState({
  onAddAddress,
}: {
  onAddAddress: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center">
      <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <MapPinIcon aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-3 font-semibold text-slate-900">
        Belum ada alamat tersimpan.
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Pilih metode antar dan ambil sendiri untuk melanjutkan tanpa alamat.
      </p>
      <Button
        type="button"
        className="mt-4 h-10 w-full sm:w-auto"
        onClick={onAddAddress}
      >
        <PlusIcon aria-hidden="true" />
        Tambah alamat
      </Button>
    </div>
  );
}

function SummaryRow({
  label,
  children,
  emphasis = false,
}: {
  label: string;
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-semibold text-slate-900",
          emphasis && "text-lg font-bold text-blue-700",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function MethodSummary({
  label,
  methodLabel,
  address,
}: {
  label: string;
  methodLabel: string | null;
  address: CustomerAddress | null;
}) {
  const location = address ? formatAddressLocation(address) : null;

  return (
    <SummaryRow label={label}>
      {methodLabel ?? "-"}
      {address ? (
        <span className="mt-1 block break-words text-xs leading-5 font-normal text-slate-500">
          {address.label}: {address.address_line}
          {location ? `, ${location}` : ""}
        </span>
      ) : null}
    </SummaryRow>
  );
}

function ShippingSummary({
  summary,
  intakeMethod,
  returnMethod,
  pickupAddress,
  deliveryAddress,
}: {
  summary: OrderDraftSummary;
  intakeMethod: OrderIntakeMethod | null;
  returnMethod: OrderReturnMethod | null;
  pickupAddress: CustomerAddress | null;
  deliveryAddress: CustomerAddress | null;
}) {
  return (
    <aside aria-label="Ringkasan pesanan" className="lg:sticky lg:top-24">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Ringkasan pesanan
          </CardTitle>
          <CardDescription>
            Pilihan tersimpan sementara selama halaman ini terbuka.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-4">
            <SummaryRow label="Layanan">{summary.service}</SummaryRow>
            <SummaryRow label="Harga">{summary.price}</SummaryRow>
            <SummaryRow label="Perkiraan">{summary.quantity}</SummaryRow>
            <SummaryRow label="Estimasi subtotal" emphasis>
              {summary.subtotal}
            </SummaryRow>
            <SummaryRow label="Estimasi durasi">{summary.duration}</SummaryRow>
            <MethodSummary
              label="Pengambilan"
              methodLabel={
                intakeMethod ? intakeMethodLabels[intakeMethod] : null
              }
              address={intakeMethod === "PICKUP" ? pickupAddress : null}
            />
            <MethodSummary
              label="Pengembalian"
              methodLabel={
                returnMethod ? returnMethodLabels[returnMethod] : null
              }
              address={returnMethod === "DELIVERY" ? deliveryAddress : null}
            />
          </dl>
        </CardContent>
      </Card>
    </aside>
  );
}

export function OrderShippingStep({
  headingRef,
  summary,
  addressesState,
  intakeMethod,
  pickupAddressId,
  returnMethod,
  deliveryAddressId,
  onIntakeMethodChange,
  onPickupAddressChange,
  onReturnMethodChange,
  onDeliveryAddressChange,
  onRetryAddresses,
  onAddressCreated,
  onBack,
  onContinue,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  summary: OrderDraftSummary;
  addressesState: CustomerAddressesState;
  intakeMethod: OrderIntakeMethod | null;
  pickupAddressId: string | null;
  returnMethod: OrderReturnMethod | null;
  deliveryAddressId: string | null;
  onIntakeMethodChange: (method: OrderIntakeMethod) => void;
  onPickupAddressChange: (addressId: string) => void;
  onReturnMethodChange: (method: OrderReturnMethod) => void;
  onDeliveryAddressChange: (addressId: string) => void;
  onRetryAddresses: () => void;
  onAddressCreated: (address: CustomerAddress) => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [addressSuccessMessage, setAddressSuccessMessage] = useState<
    string | null
  >(null);
  const addresses =
    addressesState.status === "ready" ? addressesState.addresses : [];
  const pickupAddress =
    intakeMethod === "PICKUP"
      ? (addresses.find((address) => address.id === pickupAddressId) ?? null)
      : null;
  const deliveryAddress =
    returnMethod === "DELIVERY"
      ? (addresses.find((address) => address.id === deliveryAddressId) ?? null)
      : null;
  const needsPickupAddress = intakeMethod === "PICKUP";
  const needsDeliveryAddress = returnMethod === "DELIVERY";
  const needsAddress = needsPickupAddress || needsDeliveryAddress;
  const isValid =
    intakeMethod !== null &&
    returnMethod !== null &&
    (!needsPickupAddress || pickupAddress !== null) &&
    (!needsDeliveryAddress || deliveryAddress !== null);

  function openAddressDialog() {
    setAddressSuccessMessage(null);
    setIsAddressDialogOpen(true);
  }

  async function handleAddressCreated(address: CustomerAddress) {
    await onAddressCreated(address);
    setAddressSuccessMessage(
      `Alamat ${address.label} berhasil disimpan dan dipilih.`,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isValid) {
      onContinue();
    }
  }

  return (
    <>
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
              Pengambilan &amp; pengantaran
            </h2>
            <CardDescription>
              Tentukan bagaimana laundry diterima dan dikembalikan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-7">
            <MethodSelector
              legend="Cara laundry diterima"
              helperText="Pilih cara laundry sampai ke A&W Laundry."
              name="intake-method"
              value={intakeMethod}
              options={intakeMethodOptions}
              onChange={onIntakeMethodChange}
            />

            <Separator />

            <MethodSelector
              legend="Cara laundry dikembalikan"
              helperText="Pilih cara menerima laundry setelah selesai."
              name="return-method"
              value={returnMethod}
              options={returnMethodOptions}
              onChange={onReturnMethodChange}
            />

            {needsAddress ? (
              <>
                <Separator />
                <section aria-labelledby="saved-addresses-title">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3
                        id="saved-addresses-title"
                        className="text-base font-semibold text-slate-900"
                      >
                        Alamat tersimpan
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Pilih alamat sesuai metode pengambilan dan pengembalian.
                      </p>
                    </div>
                    {addressesState.status === "ready" &&
                    addresses.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full sm:w-auto"
                        onClick={openAddressDialog}
                      >
                        <PlusIcon aria-hidden="true" />
                        Tambah alamat
                      </Button>
                    ) : null}
                  </div>

                  {addressSuccessMessage ? (
                    <Alert
                      role="status"
                      aria-live="polite"
                      className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-900"
                    >
                      <CheckCircle2Icon aria-hidden="true" />
                      <AlertTitle>Alamat berhasil ditambahkan</AlertTitle>
                      <AlertDescription className="text-emerald-800">
                        {addressSuccessMessage}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="mt-4">
                    {addressesState.status === "idle" ||
                    addressesState.status === "loading" ? (
                      <AddressLoadingState />
                    ) : null}
                    {addressesState.status === "error" ? (
                      <AddressErrorState onRetry={onRetryAddresses} />
                    ) : null}
                    {addressesState.status === "ready" &&
                    addresses.length === 0 ? (
                      <AddressEmptyState onAddAddress={openAddressDialog} />
                    ) : null}
                    {addressesState.status === "ready" &&
                    addresses.length > 0 ? (
                      <div className="space-y-6">
                        {needsPickupAddress ? (
                          <AddressSelectionGroup
                            legend="Alamat pengambilan"
                            helperText="Kurir akan mengambil laundry dari alamat ini."
                            groupName="pickup-address"
                            addresses={addresses}
                            selectedAddressId={pickupAddressId}
                            onSelect={onPickupAddressChange}
                          />
                        ) : null}
                        {needsPickupAddress && needsDeliveryAddress ? (
                          <Separator />
                        ) : null}
                        {needsDeliveryAddress ? (
                          <AddressSelectionGroup
                            legend="Alamat pengantaran"
                            helperText="Laundry yang selesai akan dikirim ke alamat ini."
                            groupName="delivery-address"
                            addresses={addresses}
                            selectedAddressId={deliveryAddressId}
                            onSelect={onDeliveryAddressChange}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            ) : null}

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
                disabled={!isValid}
              >
                Lanjutkan
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <ShippingSummary
          summary={summary}
          intakeMethod={intakeMethod}
          returnMethod={returnMethod}
          pickupAddress={pickupAddress}
          deliveryAddress={deliveryAddress}
        />
      </form>

      <CreateAddressDialog
        open={isAddressDialogOpen}
        hasDefaultAddress={addresses.some((address) => address.is_default)}
        onOpenChange={setIsAddressDialogOpen}
        onCreated={handleAddressCreated}
      />
    </>
  );
}
