export type ServicePriceType =
  | "PER_KG"
  | "PER_ITEM"
  | "PER_METER"
  | "FIXED";

export type ServiceBillingUnit = "KG" | "PAIR" | "PCS" | "M2";

export type ActiveService = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  price_type: ServicePriceType;
  billing_unit: ServiceBillingUnit;
  estimated_duration_hours: number;
  image_url: string | null;
};
