import type { AdminPaymentSummary } from "./types";

export function calculateAdminPaidRevenue(payments: AdminPaymentSummary[]) {
  return payments.reduce((total, payment) => {
    if (
      payment.orderStatus === "CANCELLED" ||
      payment.paymentStatus !== "PAID" ||
      payment.paidAmount === null
    ) {
      return total;
    }

    return total + payment.paidAmount;
  }, 0);
}
