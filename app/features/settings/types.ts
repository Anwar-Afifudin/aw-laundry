export type BusinessSettings = {
  id: number;
  business_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_time: string | null;
  closing_time: string | null;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  pickup_fee: number;
  delivery_fee: number;
  minimum_order: number;
  created_at: string;
  updated_at: string;
};

export type BusinessSettingsInput = {
  businessName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  openingTime: string | null;
  closingTime: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupFee: number;
  deliveryFee: number;
  minimumOrder: number;
};
