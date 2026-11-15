import type { OrderIntakeMethod, OrderReturnMethod, OrderStatus, ProductionStatus } from "./types";

export const orderStatusSequence: readonly OrderStatus[] = [
  "ORDER_CREATED", "WAITING_PICKUP", "PICKED_UP", "RECEIVED", "WEIGHING",
  "WAITING_PROCESS", "WASHING", "DRYING", "IRONING", "QUALITY_CONTROL",
  "PACKING", "READY", "OUT_FOR_DELIVERY", "COMPLETED",
];

export function isTerminalOrderStatus(status: OrderStatus) {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function getAllowedNextStatuses(
  status: OrderStatus,
  intakeMethod: OrderIntakeMethod,
  returnMethod: OrderReturnMethod,
  itemProductionSteps?: readonly (readonly ProductionStatus[])[],
): OrderStatus[] {
  if (isTerminalOrderStatus(status)) return [];

  let next: OrderStatus;
  const configuredSteps = itemProductionSteps?.flat() ?? [];
  const productionSteps = configuredSteps.length > 0
    ? orderStatusSequence.filter((candidate): candidate is ProductionStatus =>
        configuredSteps.includes(candidate as ProductionStatus),
      )
    : (["WASHING", "DRYING", "IRONING", "QUALITY_CONTROL", "PACKING", "READY"] satisfies ProductionStatus[]);
  const nextProductionStep = () => {
    if (status === "WAITING_PROCESS") return productionSteps[0];
    const currentIndex = orderStatusSequence.indexOf(status);
    return productionSteps.find((candidate) => orderStatusSequence.indexOf(candidate) > currentIndex);
  };
  switch (status) {
    case "ORDER_CREATED": next = intakeMethod === "PICKUP" ? "WAITING_PICKUP" : "RECEIVED"; break;
    case "WAITING_PICKUP": next = "PICKED_UP"; break;
    case "PICKED_UP": next = "RECEIVED"; break;
    case "RECEIVED": next = "WEIGHING"; break;
    case "WEIGHING": next = "WAITING_PROCESS"; break;
    case "WAITING_PROCESS":
    case "WASHING":
    case "DRYING":
    case "IRONING":
    case "QUALITY_CONTROL":
    case "PACKING": {
      const productionNext = nextProductionStep();
      if (!productionNext) return [];
      next = productionNext;
      break;
    }
    case "READY": next = returnMethod === "DELIVERY" ? "OUT_FOR_DELIVERY" : "COMPLETED"; break;
    case "OUT_FOR_DELIVERY": next = "COMPLETED"; break;
    default: return [];
  }

  return [next, "CANCELLED"];
}
