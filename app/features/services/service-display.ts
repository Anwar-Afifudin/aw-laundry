import type { ProductionStep, ServiceBillingUnit, ServicePriceType } from "./types";

export const billingUnitLabels: Record<ServiceBillingUnit, string> = {
  KG: "kg",
  PAIR: "pasang",
  PCS: "pcs",
  M2: "m²",
};

export const priceTypeLabels: Record<ServicePriceType, string> = {
  PER_KG: "Per kilogram",
  PER_ITEM: "Per item",
  PER_METER: "Per meter",
  FIXED: "Harga tetap",
};

export const productionStepLabels: Record<ProductionStep, string> = {
  WASHING: "Cuci",
  DRYING: "Keringkan",
  IRONING: "Setrika",
  QUALITY_CONTROL: "Kontrol kualitas",
  PACKING: "Kemas",
  READY: "Siap",
};

export const productionSteps: ProductionStep[] = [
  "WASHING", "DRYING", "IRONING", "QUALITY_CONTROL", "PACKING", "READY",
];

export function formatServiceDuration(hours: number) {
  if (hours < 24) return `${hours} jam`;
  const days = hours / 24;
  return Number.isInteger(days) ? `${days} hari` : `${days.toLocaleString("id-ID")} hari`;
}
