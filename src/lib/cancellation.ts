/**
 * Cancellation and refund policy — single source of truth.
 * Amounts are always recomputed on the server; the client only previews them.
 */

export const CANCELLATION_POLICY = {
  /** Full refund (fare + service fee) when cancelled this many hours before departure. */
  fullRefundHours: 24,
  /** Fare-only refund (service fee kept) down to this many hours before departure. */
  partialRefundHours: 2,
  /** Share of the seat fare refunded in the partial window. */
  partialFareShare: 1,
} as const;

export type RefundQuote = {
  amount: number;
  label: string;
  refundsServiceFee: boolean;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function quoteRefund(input: {
  totalAmount: number;
  serviceFee: number;
  taxAmount?: number;
  departAt: string | Date;
  paid: boolean;
  cancelledByDriver?: boolean;
  now?: Date;
}): RefundQuote {
  if (!input.paid) {
    return { amount: 0, label: "No payment was taken.", refundsServiceFee: false };
  }
  if (input.cancelledByDriver) {
    return {
      amount: round2(input.totalAmount),
      label: "Full refund — the driver cancelled this ride.",
      refundsServiceFee: true,
    };
  }

  const now = input.now ?? new Date();
  const depart = new Date(input.departAt);
  const hours = (depart.getTime() - now.getTime()) / 3_600_000;

  if (hours >= CANCELLATION_POLICY.fullRefundHours) {
    return {
      amount: round2(input.totalAmount),
      label: `Full refund — more than ${CANCELLATION_POLICY.fullRefundHours} hours before departure.`,
      refundsServiceFee: true,
    };
  }
  if (hours >= CANCELLATION_POLICY.partialRefundHours) {
    const fare = Math.max(
      0,
      input.totalAmount - input.serviceFee - (input.taxAmount ?? 0),
    );
    return {
      amount: round2(fare * CANCELLATION_POLICY.partialFareShare),
      label: "Seat fare refunded — the service fee and tax are not refundable this close to departure.",
      refundsServiceFee: false,
    };
  }
  return {
    amount: 0,
    label: `No refund — cancelled within ${CANCELLATION_POLICY.partialRefundHours} hours of departure.`,
    refundsServiceFee: false,
  };
}
