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
  items: Array<{
    service: string;
    price: string;
    quantity: string;
    subtotal: string;
  }>;
  subtotal: string;
  duration: string;
};

export type CreateCustomerOrderInput = {
  orderId: string;
  items: Array<{ serviceId: string; estimatedQuantity: number }>;
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
export type ServiceBillingUnit = "KG" | "PAIR" | "PCS" | "M2";

export type CustomerOrderItemSummary = {
  id: string;
  serviceName: string;
  priceType: OrderPriceType;
  billingUnit: ServiceBillingUnit;
  estimatedQuantity: number | null;
  actualQuantity: number | null;
  actualItemCount: number | null;
  productionSteps?: ProductionStatus[];
  productionStatus?: OrderItemProductionStatus | null;
  productionHistory?: OrderItemProductionStatusEvent[];
};

export type ProductionStatus = Extract<
  OrderStatus,
  "WASHING" | "DRYING" | "IRONING" | "QUALITY_CONTROL" | "PACKING" | "READY"
>;

export type OrderItemProductionStatus = "WAITING_PROCESS" | ProductionStatus;

export type OrderItemProductionStatusEvent = {
  id: string;
  fromStatus: OrderItemProductionStatus | null;
  status: OrderItemProductionStatus;
  note: string | null;
  createdAt: string;
};

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  estimatedCompletionAt: string | null;
  estimatedTotal: number;
  finalTotal: number;
  intakeMethod: OrderIntakeMethod;
  returnMethod: OrderReturnMethod;
  items: CustomerOrderItemSummary[];
};

export type AdminOrderSummary = CustomerOrderSummary & {
  customerName: string;
  paymentStatus: OrderPaymentStatus;
};

export type OrderPaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type OrderAddressSnapshot = {
  label: string | null;
  recipientName: string;
  phone: string;
  addressLine: string;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
};

export type CustomerOrderDetailItem = CustomerOrderItemSummary & {
  unitPrice: number;
  estimatedSubtotal: number;
  finalSubtotal: number;
  notes: string | null;
};

export type CustomerOrderStatusEvent = {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
};

export type CustomerOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  createdAt: string;
  estimatedCompletionAt: string | null;
  actualCompletionAt: string | null;
  specialInstructions: string | null;
  estimatedSubtotal: number;
  finalSubtotal: number;
  pickupFee: number;
  deliveryFee: number;
  discountAmount: number;
  additionalCharge: number;
  estimatedTotal: number;
  finalTotal: number;
  intakeMethod: OrderIntakeMethod;
  returnMethod: OrderReturnMethod;
  pickupAddress: OrderAddressSnapshot | null;
  deliveryAddress: OrderAddressSnapshot | null;
  items: CustomerOrderDetailItem[];
  statusHistory: CustomerOrderStatusEvent[];
};

export type AdminOrderDetail = CustomerOrderDetail & {
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
};

export type CreateCustomerOrderErrorKind =
  | "authentication"
  | "authorization"
  | "validation"
  | "service"
  | "server";
