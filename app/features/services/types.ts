export type ServicePriceType =
  | "PER_KG"
  | "PER_ITEM"
  | "PER_METER"
  | "FIXED";

export type ActiveService = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  price_type: ServicePriceType;
  estimated_duration_hours: number;
  image_url: string | null;
};
