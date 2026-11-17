import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Building2Icon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  RefreshCwIcon,
  ShoppingBasketIcon,
  TruckIcon,
} from "lucide-react";

import { PageHeader } from "~/components/shared/page-header";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import {
  UpdateBusinessSettingsError,
  updateBusinessSettings,
} from "~/features/settings/mutations/update-business-settings";
import { getBusinessSettings } from "~/features/settings/queries/get-business-settings";
import type { BusinessSettings, BusinessSettingsInput } from "~/features/settings/types";
import { cn } from "~/lib/utils";

type PageState =
  | { status: "loading" }
  | { status: "ready"; settings: BusinessSettings }
  | { status: "error" };

type FormValues = {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  openingTime: string;
  closingTime: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupFee: string;
  deliveryFee: string;
  minimumOrder: string;
};

function normalizeTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

function settingsToForm(settings: BusinessSettings): FormValues {
  return {
    businessName: settings.business_name,
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    address: settings.address ?? "",
    openingTime: normalizeTime(settings.opening_time),
    closingTime: normalizeTime(settings.closing_time),
    pickupEnabled: settings.pickup_enabled,
    deliveryEnabled: settings.delivery_enabled,
    pickupFee: String(settings.pickup_fee),
    deliveryFee: String(settings.delivery_fee),
    minimumOrder: String(settings.minimum_order),
  };
}

function validate(values: FormValues): string | null {
  const businessName = values.businessName.trim();
  if (!businessName) return "Nama usaha wajib diisi.";
  if (businessName.length > 100) return "Nama usaha maksimal 100 karakter.";
  if (values.phone.trim().length > 30) return "Nomor telepon maksimal 30 karakter.";
  if (values.email.trim().length > 254) return "Email maksimal 254 karakter.";
  if (values.address.trim().length > 500) return "Alamat maksimal 500 karakter.";

  const numericFields: Array<[string, string]> = [
    [values.pickupFee, "Biaya pickup"],
    [values.deliveryFee, "Biaya delivery"],
    [values.minimumOrder, "Minimum order"],
  ];
  for (const [value, label] of numericFields) {
    if (value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
      return `${label} harus berupa angka 0 atau lebih.`;
    }
  }
  return null;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Memuat pengaturan">
      {[0, 1, 2, 3].map((item) => (
        <Card key={item} className="border-slate-200 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2Icon;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="border-b border-slate-200">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

export function meta() {
  return [{ title: "Pengaturan Admin | A&W Laundry" }];
}

export default function AdminSettingsPage() {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [values, setValues] = useState<FormValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setError(null);
    setSuccess(false);
    try {
      const settings = await getBusinessSettings();
      setState({ status: "ready", settings });
      setValues(settingsToForm(settings));
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => current ? { ...current, [key]: value } : current);
    setSuccess(false);
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values || isSaving) return;

    const validationError = validate(values);
    if (validationError) {
      setError(validationError);
      setSuccess(false);
      return;
    }

    const nullableText = (value: string) => value.trim() || null;
    const input: BusinessSettingsInput = {
      businessName: values.businessName.trim(),
      phone: nullableText(values.phone),
      email: nullableText(values.email),
      address: nullableText(values.address),
      openingTime: values.openingTime || null,
      closingTime: values.closingTime || null,
      pickupEnabled: values.pickupEnabled,
      deliveryEnabled: values.deliveryEnabled,
      pickupFee: Number(values.pickupFee),
      deliveryFee: Number(values.deliveryFee),
      minimumOrder: Number(values.minimumOrder),
    };

    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const settings = await updateBusinessSettings(input);
      setState({ status: "ready", settings });
      setValues(settingsToForm(settings));
      setSuccess(true);
    } catch (caught) {
      setError(
        caught instanceof UpdateBusinessSettingsError
          ? caught.message
          : "Pengaturan belum dapat disimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Konfigurasi admin"
        title="Pengaturan"
        description="Kelola profil usaha, jam operasional, serta aturan pickup dan delivery."
      />

      {state.status === "loading" ? (
        <SettingsSkeleton />
      ) : state.status === "error" || !values ? (
        <Card className="border-slate-200 text-center shadow-sm">
          <CardContent className="flex flex-col items-center py-12">
            <CircleAlertIcon className="size-11 text-rose-500" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Pengaturan belum dapat dimuat</h2>
            <p className="mt-2 text-sm text-slate-600">Periksa koneksi lalu coba lagi.</p>
            <Button type="button" className="mt-5" onClick={() => void load()}>
              <RefreshCwIcon aria-hidden="true" /> Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          {success ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2Icon aria-hidden="true" />
              <AlertDescription className="text-emerald-700">Pengaturan berhasil disimpan.</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Card className="border-slate-200 shadow-sm">
            <SectionTitle
              icon={Building2Icon}
              title="Profil usaha"
              description="Informasi utama A&W Laundry yang digunakan dalam operasional."
            />
            <CardContent className="grid gap-5 pt-1 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="business-name">Nama usaha *</Label>
                <Input id="business-name" value={values.businessName} maxLength={100} onChange={(event) => setField("businessName", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-phone">Nomor telepon</Label>
                <Input id="business-phone" type="tel" value={values.phone} maxLength={30} onChange={(event) => setField("phone", event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="business-email">Email</Label>
                <Input id="business-email" type="email" value={values.email} maxLength={254} onChange={(event) => setField("email", event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="business-address">Alamat</Label>
                <Textarea id="business-address" value={values.address} maxLength={500} rows={4} onChange={(event) => setField("address", event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <SectionTitle
              icon={Clock3Icon}
              title="Jam operasional"
              description="Kosongkan jam jika jadwal operasional belum ditentukan."
            />
            <CardContent className="grid gap-5 pt-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="opening-time">Jam buka</Label>
                <Input id="opening-time" type="time" value={values.openingTime} onChange={(event) => setField("openingTime", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing-time">Jam tutup</Label>
                <Input id="closing-time" type="time" value={values.closingTime} onChange={(event) => setField("closingTime", event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <SectionTitle
              icon={TruckIcon}
              title="Pickup & Delivery"
              description="Atur ketersediaan dan biaya layanan antar-jemput."
            />
            <CardContent className="grid gap-5 pt-1 lg:grid-cols-2">
              <div className={cn("rounded-xl border p-4", values.pickupEnabled ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-slate-50")}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={values.pickupEnabled} onChange={(event) => setField("pickupEnabled", event.target.checked)} className="mt-0.5 size-4 accent-blue-600" />
                  <span><span className="block text-sm font-semibold text-slate-950">Pickup aktif</span><span className="mt-1 block text-xs text-slate-500">Customer dapat meminta pengambilan laundry.</span></span>
                </label>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="pickup-fee">Biaya pickup (Rp)</Label>
                  <Input id="pickup-fee" type="number" min="0" step="1" value={values.pickupFee} disabled={!values.pickupEnabled} onChange={(event) => setField("pickupFee", event.target.value)} />
                  <p className="text-xs text-slate-500">Biaya hanya berlaku untuk pesanan yang menggunakan pickup.</p>
                </div>
              </div>

              <div className={cn("rounded-xl border p-4", values.deliveryEnabled ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-slate-50")}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={values.deliveryEnabled} onChange={(event) => setField("deliveryEnabled", event.target.checked)} className="mt-0.5 size-4 accent-blue-600" />
                  <span><span className="block text-sm font-semibold text-slate-950">Delivery aktif</span><span className="mt-1 block text-xs text-slate-500">Customer dapat meminta pengantaran laundry.</span></span>
                </label>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="delivery-fee">Biaya delivery (Rp)</Label>
                  <Input id="delivery-fee" type="number" min="0" step="1" value={values.deliveryFee} disabled={!values.deliveryEnabled} onChange={(event) => setField("deliveryFee", event.target.value)} />
                  <p className="text-xs text-slate-500">Biaya hanya berlaku untuk pesanan yang menggunakan delivery.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <SectionTitle
              icon={ShoppingBasketIcon}
              title="Aturan pesanan"
              description="Tentukan batas nilai pesanan baru pelanggan."
            />
            <CardContent className="pt-1">
              <div className="max-w-xl space-y-2">
                <Label htmlFor="minimum-order">Minimum order (Rp)</Label>
                <Input id="minimum-order" type="number" min="0" step="1" value={values.minimumOrder} onChange={(event) => setField("minimumOrder", event.target.value)} />
                <p className="text-xs leading-5 text-slate-500">Customer tidak dapat membuat pesanan baru jika subtotal layanan berada di bawah nilai ini. Isi 0 untuk tanpa minimum order.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
