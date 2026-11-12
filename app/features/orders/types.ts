export type OrderIntakeMethod = "PICKUP" | "DROPOFF";
export type OrderReturnMethod = "DELIVERY" | "CUSTOMER_PICKUP";

export type OrderStatus =
  | "ORDER_CREATED"
  | "WAITING_PICKUP"
  | "PICKED_UP"
  | "RECEIVED"
  | "WEIGHING"
  | "WAITING_PROCESS"
  | "WASHING"
  | "DRYING"
  | "IRONING"
  | "QUALITY_CONTROL"
  | "PACKING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

export type OrderDraftSummary = {
  service: string;
  price: string;
  quantity: string;
  subtotal: string;
  duration: string;
};

export type CreateCustomerOrderInput = {
  orderId: string;
  serviceId: string;
  estimatedQuantity: number;
  specialInstructions: string | null;
  intakeMethod: OrderIntakeMethod;
  returnMethod: OrderReturnMethod;
  pickupAddressId: string | null;
  deliveryAddressId: string | null;
};

export type CreatedCustomerOrder = {
  id: string;
  orderNumber: string;
  status: Extract<OrderStatus, "ORDER_CREATED">;
  serviceName: string;
  estimatedTotal: number;
  estimatedCompletionAt: string;
  intakeMethod: OrderIntakeMethod;
  returnMethod: OrderReturnMethod;
  createdAt: string;
};

export type OrderPriceType = "PER_KG" | "PER_ITEM" | "PER_METER" | "FIXED";

export type CustomerOrderItemSummary = {
  id: string;
  serviceName: string;
  priceType: OrderPriceType;
  estimatedQuantity: number | null;
  actualQuantity: number | null;
};

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  estimatedCompletionAt: string | null;
  estimatedTotal: number;
  intakeMethod: OrderIntakeMethod;
  returnMethod: OrderReturnMethod;
  items: CustomerOrderItemSummary[];
};

export type CreateCustomerOrderErrorKind =
  | "authentication"
  | "authorization"
  | "validation"
  | "service"
  | "server";
