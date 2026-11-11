import type { FormEvent, RefObject } from "react";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ClipboardCheckIcon,
  HomeIcon,
  InfoIcon,
  LoaderCircleIcon,
  MapPinIcon,
  PhoneIcon,
  StoreIcon,
  TruckIcon,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { CustomerAddress } from "~/features/addresses/types";
import type {
  CreatedCustomerOrder,
  OrderDraftSummary,
  OrderIntakeMethod,
  OrderReturnMethod,
} from "~/features/orders/types";

const intakeMethodLabels: Record<OrderIntakeMethod, string> = {
  PICKUP: "Dijemput A&W Laundry",
  DROPOFF: "Antar sendiri",
};

const returnMethodLabels: Record<OrderReturnMethod, string> = {
  DELIVERY: "Diantar ke alamat",
  CUSTOMER_PICKUP: "Ambil sendiri",
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});

export type OrderReviewError = {
  title: string;
  message: string;
};

function formatAddressLocation(address: CustomerAddress) {
  const location = [address.district, address.city, address.postal_code].filter(
    (part): part is string => Boolean(part?.trim()),
  );

  return location.length > 0 ? location.join(", ") : null;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Akan dikonfirmasi"
    : dateTimeFormatter.format(date);
}

function ReviewDetail({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd
        className={
          emphasis
            ? "mt-1 text-lg font-bold text-blue-700"
            : "mt-1 font-semibold text-slate-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function AddressSummary({ address }: { address: CustomerAddress }) {
  const location = formatAddressLocation(address);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <MapPinIcon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 text-sm leading-6 text-slate-600">
          <p className="font-semibold text-slate-900">{address.label}</p>
          <p className="font-medium text-slate-800">
            {address.recipient_name}
          </p>
          <p className="flex items-center gap-1.5">
            <PhoneIcon aria-hidden="true" className="size-3.5" />
            {address.phone}
          </p>
          <p className="break-words">{address.address_line}</p>
          {location ? <p>{location}</p> : null}
          {address.notes ? (
            <p className="mt-1 text-xs text-slate-500">
              Catatan alamat: {address.notes}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MethodReview({
  label,
  methodLabel,
  usesCourier,
  address,
}: {
  label: string;
  methodLabel: string;
  usesCourier: boolean;
  address: CustomerAddress | null;
}) {
  const Icon = usesCourier ? TruckIcon : StoreIcon;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
        <Icon aria-hidden="true" className="size-4 text-blue-600" />
        {methodLabel}
      </p>
      {address ? <AddressSummary address={address} /> : null}
    </div>
  );
}

export function OrderReviewStep({
  headingRef,
  summary,
  notes,
  intakeMethod,
  returnMethod,
  pickupAddress,
  deliveryAddress,
  isSubmitting,
  error,
  onBack,
  onCreateOrder,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  summary: OrderDraftSummary;
  notes: string;
  intakeMethod: OrderIntakeMethod;
  returnMethod: OrderReturnMethod;
  pickupAddress: CustomerAddress | null;
  deliveryAddress: CustomerAddress | null;
  isSubmitting: boolean;
  error: OrderReviewError | null;
  onBack: () => void;
  onCreateOrder: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateOrder();
  }

  return (
    <form
      noValidate
      aria-busy={isSubmitting}
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
            Periksa pesanan Anda
          </h2>
          <CardDescription>
            Pastikan layanan, jumlah laundry, dan pengiriman sudah sesuai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section aria-labelledby="review-service-title">
            <h3
              id="review-service-title"
              className="text-base font-semibold text-slate-900"
            >
              Detail laundry
            </h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <ReviewDetail label="Layanan" value={summary.service} />
              <ReviewDetail label="Harga layanan" value={summary.price} />
              <ReviewDetail label="Perkiraan" value={summary.quantity} />
              <ReviewDetail
                label="Estimasi subtotal"
                value={summary.subtotal}
                emphasis
              />
              <ReviewDetail
                label="Estimasi durasi"
                value={summary.duration}
              />
            </dl>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Catatan laundry
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {notes.trim() || "Tidak ada catatan."}
              </p>
            </div>
          </section>

          <Separator />

          <section aria-labelledby="review-shipping-title">
            <h3
              id="review-shipping-title"
              className="text-base font-semibold text-slate-900"
            >
              Pengambilan &amp; pengantaran
            </h3>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <MethodReview
                label="Pengambilan"
                methodLabel={intakeMethodLabels[intakeMethod]}
                usesCourier={intakeMethod === "PICKUP"}
                address={intakeMethod === "PICKUP" ? pickupAddress : null}
              />
              <MethodReview
                label="Pengembalian"
                methodLabel={returnMethodLabels[returnMethod]}
                usesCourier={returnMethod === "DELIVERY"}
                address={returnMethod === "DELIVERY" ? deliveryAddress : null}
              />
            </div>
          </section>
        </CardContent>
      </Card>

      <aside aria-label="Konfirmasi pesanan" className="lg:sticky lg:top-24">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Konfirmasi pesanan
            </CardTitle>
            <CardDescription>
              Harga final akan diverifikasi setelah laundry diterima.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                Estimasi total
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-800">
                {summary.subtotal}
              </p>
            </div>

            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
              <InfoIcon aria-hidden="true" />
              <AlertTitle>Harga masih berupa estimasi</AlertTitle>
              <AlertDescription className="leading-6 text-blue-800">
                Harga final ditentukan setelah jumlah atau berat laundry
                diverifikasi oleh A&W Laundry.
              </AlertDescription>
            </Alert>

            {error ? (
              <Alert variant="destructive" role="alert">
                <CircleAlertIcon aria-hidden="true" />
                <AlertTitle>{error.title}</AlertTitle>
                <AlertDescription className="leading-6">
                  {error.message}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 border-t border-slate-100 pt-4">
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircleIcon
                    aria-hidden="true"
                    className="animate-spin"
                  />
                ) : (
                  <ClipboardCheckIcon aria-hidden="true" />
                )}
                {isSubmitting ? "Membuat pesanan..." : "Buat Pesanan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full"
                disabled={isSubmitting}
                onClick={onBack}
              >
                <ArrowLeftIcon aria-hidden="true" />
                Kembali
              </Button>
            </div>

            {isSubmitting ? (
              <p className="text-center text-xs leading-5 text-slate-500" role="status">
                Pesanan sedang diverifikasi dan disimpan. Jangan tutup halaman
                ini.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

export function OrderCreationSuccess({
  order,
  headingRef,
  onViewOrders,
  onBackHome,
}: {
  order: CreatedCustomerOrder;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onViewOrders: () => void;
  onBackHome: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesanan berhasil"
        title="Pesanan Anda sudah dibuat"
        description="A&W Laundry telah menerima permintaan laundry Anda."
      />

      <Card className="mx-auto max-w-4xl shadow-sm">
        <CardContent className="px-5 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2Icon aria-hidden="true" className="size-7" />
            </span>
            <Badge
              variant="outline"
              className="mt-5 border-slate-300 bg-slate-50 text-slate-700"
            >
              Order dibuat
            </Badge>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-3 font-heading text-2xl font-bold text-slate-900 focus:outline-none sm:text-3xl"
            >
              {order.orderNumber}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Simpan nomor pesanan ini untuk memantau proses laundry Anda.
            </p>
          </div>

          <dl className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            <ReviewDetail label="Layanan" value={order.serviceName} />
            <ReviewDetail
              label="Estimasi total"
              value={rupiahFormatter.format(order.estimatedTotal)}
              emphasis
            />
            <ReviewDetail
              label="Pengambilan"
              value={intakeMethodLabels[order.intakeMethod]}
            />
            <ReviewDetail
              label="Pengembalian"
              value={returnMethodLabels[order.returnMethod]}
            />
            <ReviewDetail
              label="Status awal"
              value="Order dibuat"
            />
            <ReviewDetail
              label="Estimasi selesai"
              value={formatDateTime(order.estimatedCompletionAt)}
            />
          </dl>

          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              className="h-11 w-full"
              onClick={onViewOrders}
            >
              <ClipboardCheckIcon aria-hidden="true" />
              Lihat Pesanan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full"
              onClick={onBackHome}
            >
              <HomeIcon aria-hidden="true" />
              Kembali ke Beranda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
