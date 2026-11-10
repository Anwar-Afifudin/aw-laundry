import { useState, type FormEvent } from "react";
import {
  CircleAlertIcon,
  LoaderCircleIcon,
  MapPinPlusIcon,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { createCurrentCustomerAddress } from "~/features/addresses/mutations/create-current-customer-address";
import type {
  CreateCustomerAddressInput,
  CustomerAddress,
} from "~/features/addresses/types";

type AddressFormValues = {
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  district: string;
  city: string;
  postal_code: string;
  notes: string;
  is_default: boolean;
};

type RequiredAddressField =
  | "label"
  | "recipient_name"
  | "phone"
  | "address_line";

type AddressTextField = Exclude<keyof AddressFormValues, "is_default">;
type AddressFormErrors = Partial<Record<RequiredAddressField, string>>;

const fieldIds: Record<RequiredAddressField, string> = {
  label: "new-address-label",
  recipient_name: "new-address-recipient-name",
  phone: "new-address-phone",
  address_line: "new-address-address-line",
};

const initialAddressFormValues: AddressFormValues = {
  label: "",
  recipient_name: "",
  phone: "",
  address_line: "",
  district: "",
  city: "",
  postal_code: "",
  notes: "",
  is_default: false,
};

function validateAddressForm(values: AddressFormValues): AddressFormErrors {
  const errors: AddressFormErrors = {};

  if (!values.label.trim()) {
    errors.label = "Label alamat wajib diisi.";
  }

  if (!values.recipient_name.trim()) {
    errors.recipient_name = "Nama penerima wajib diisi.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Nomor telepon wajib diisi.";
  }

  if (!values.address_line.trim()) {
    errors.address_line = "Alamat lengkap wajib diisi.";
  }

  return errors;
}

function normalizeOptionalText(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
}

function RequiredIndicator() {
  return (
    <span aria-hidden="true" className="text-red-600">
      *
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

export function CreateAddressDialog({
  open,
  hasDefaultAddress,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  hasDefaultAddress: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (address: CustomerAddress) => Promise<void>;
}) {
  const [values, setValues] = useState<AddressFormValues>(
    initialAddressFormValues,
  );
  const [errors, setErrors] = useState<AddressFormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setValues(initialAddressFormValues);
    setErrors({});
    setRequestError(null);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (isSubmitting) {
      return;
    }

    if (!nextOpen) {
      resetForm();
    }

    onOpenChange(nextOpen);
  }

  function updateTextField(field: AddressTextField, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setRequestError(null);

    if (
      field === "label" ||
      field === "recipient_name" ||
      field === "phone" ||
      field === "address_line"
    ) {
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    const validationErrors = validateAddressForm(values);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setRequestError(null);
      const firstInvalidField = Object.keys(
        validationErrors,
      )[0] as RequiredAddressField;
      document.getElementById(fieldIds[firstInvalidField])?.focus();
      return;
    }

    const input: CreateCustomerAddressInput = {
      label: values.label.trim(),
      recipient_name: values.recipient_name.trim(),
      phone: values.phone.trim(),
      address_line: values.address_line.trim(),
      district: normalizeOptionalText(values.district),
      city: normalizeOptionalText(values.city),
      postal_code: normalizeOptionalText(values.postal_code),
      notes: normalizeOptionalText(values.notes),
      is_default: hasDefaultAddress ? false : values.is_default,
    };

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const address = await createCurrentCustomerAddress(input);
      await onCreated(address);
      resetForm();
      onOpenChange(false);
    } catch {
      setRequestError(
        "Alamat belum berhasil disimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-5 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-2xl sm:p-6"
      >
        <DialogHeader className="pr-8">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <MapPinPlusIcon aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Tambah alamat
          </DialogTitle>
          <DialogDescription className="leading-6 text-slate-600">
            Simpan alamat untuk penjemputan atau pengantaran laundry.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          aria-busy={isSubmitting}
          className="grid gap-5"
          onSubmit={handleSubmit}
        >
          {requestError ? (
            <Alert variant="destructive" role="alert">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle>Alamat belum tersimpan</AlertTitle>
              <AlertDescription>{requestError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-address-label">
                Label alamat
                <RequiredIndicator />
              </Label>
              <Input
                id="new-address-label"
                value={values.label}
                autoFocus
                required
                disabled={isSubmitting}
                placeholder="Contoh: Rumah"
                aria-invalid={errors.label ? true : undefined}
                aria-describedby={
                  errors.label ? "new-address-label-error" : undefined
                }
                className="mt-2 h-10"
                onChange={(event) =>
                  updateTextField("label", event.target.value)
                }
              />
              <FieldError
                id="new-address-label-error"
                message={errors.label}
              />
            </div>

            <div>
              <Label htmlFor="new-address-recipient-name">
                Nama penerima
                <RequiredIndicator />
              </Label>
              <Input
                id="new-address-recipient-name"
                value={values.recipient_name}
                autoComplete="name"
                required
                disabled={isSubmitting}
                placeholder="Nama penerima laundry"
                aria-invalid={errors.recipient_name ? true : undefined}
                aria-describedby={
                  errors.recipient_name
                    ? "new-address-recipient-name-error"
                    : undefined
                }
                className="mt-2 h-10"
                onChange={(event) =>
                  updateTextField("recipient_name", event.target.value)
                }
              />
              <FieldError
                id="new-address-recipient-name-error"
                message={errors.recipient_name}
              />
            </div>

            <div>
              <Label htmlFor="new-address-phone">
                Nomor telepon
                <RequiredIndicator />
              </Label>
              <Input
                id="new-address-phone"
                type="tel"
                value={values.phone}
                autoComplete="tel"
                inputMode="tel"
                required
                disabled={isSubmitting}
                placeholder="Contoh: 081234567890"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={
                  errors.phone ? "new-address-phone-error" : undefined
                }
                className="mt-2 h-10"
                onChange={(event) =>
                  updateTextField("phone", event.target.value)
                }
              />
              <FieldError
                id="new-address-phone-error"
                message={errors.phone}
              />
            </div>

            <div>
              <Label htmlFor="new-address-postal-code">Kode pos</Label>
              <Input
                id="new-address-postal-code"
                value={values.postal_code}
                autoComplete="postal-code"
                inputMode="numeric"
                disabled={isSubmitting}
                placeholder="Contoh: 50123"
                className="mt-2 h-10"
                onChange={(event) =>
                  updateTextField("postal_code", event.target.value)
                }
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="new-address-address-line">
                Alamat lengkap
                <RequiredIndicator />
              </Label>
              <Textarea
                id="new-address-address-line"
                value={values.address_line}
                autoComplete="street-address"
                required
                disabled={isSubmitting}
                rows={3}
                placeholder="Nama jalan, nomor rumah, RT/RW, dan patokan"
                aria-invalid={errors.address_line ? true : undefined}
                aria-describedby={
                  errors.address_line
                    ? "new-address-address-line-error"
                    : undefined
                }
                className="mt-2 min-h-24 resize-y"
                onChange={(event) =>
                  updateTextField("address_line", event.target.value)
                }
              />
              <FieldError
                id="new-address-address-line-error"
                message={errors.address_line}
              />
            </div>

            <div>
              <Label htmlFor="new-address-district">Kecamatan</Label>
              <Input
                id="new-address-district"
                value={values.district}
                autoComplete="address-level3"
                disabled={isSubmitting}
                placeholder="Contoh: Tembalang"
                className="mt-2 h-10"
                onChange={(event) =>
                  updateTextField("district", event.target.value)
                }
              />
            </div>

            <div>
              <Label htmlFor="new-address-city">Kota/Kabupaten</Label>
              <Input
                id="new-address-city"
                value={values.city}
                autoComplete="address-level2"
                disabled={isSubmitting}
                placeholder="Contoh: Kota Semarang"
                className="mt-2 h-10"
                onChange={(event) =>
                  updateTextField("city", event.target.value)
                }
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="new-address-notes">Catatan alamat</Label>
              <Textarea
                id="new-address-notes"
                value={values.notes}
                disabled={isSubmitting}
                rows={3}
                placeholder="Contoh: Rumah pagar hitam, titip ke satpam"
                className="mt-2 min-h-20 resize-y"
                onChange={(event) =>
                  updateTextField("notes", event.target.value)
                }
              />
            </div>

            <label
              htmlFor="new-address-is-default"
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2"
            >
              <input
                id="new-address-is-default"
                type="checkbox"
                checked={values.is_default}
                disabled={isSubmitting || hasDefaultAddress}
                aria-describedby="new-address-is-default-help"
                className="mt-0.5 size-4 shrink-0 accent-blue-600 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600/30"
                onChange={(event) => {
                  setRequestError(null);
                  setValues((currentValues) => ({
                    ...currentValues,
                    is_default: event.target.checked,
                  }));
                }}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Jadikan alamat utama
                </span>
                <span
                  id="new-address-is-default-help"
                  className="mt-1 block text-xs leading-5 text-slate-600"
                >
                  {hasDefaultAddress
                    ? "Anda sudah memiliki alamat utama. Penggantian alamat utama belum tersedia pada tahap ini."
                    : "Alamat utama akan ditampilkan lebih dulu pada daftar alamat."}
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="-mx-5 -mb-5 p-5 sm:-mx-6 sm:-mb-6 sm:p-6">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isSubmitting}
              className="h-10 w-full sm:w-auto"
              onClick={() => handleDialogOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="h-10 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : null}
              {isSubmitting ? "Menyimpan..." : "Simpan alamat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
