export const SERVICE_FEE_RATE = 0.12;
export const SERVICE_FEE_MIN = 1;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function quoteBooking(pricePerSeat: number, seats: number) {
  const subtotal = round2(pricePerSeat * seats);
  const serviceFee = round2(Math.max(SERVICE_FEE_MIN, subtotal * SERVICE_FEE_RATE));
  return {
    subtotal,
    serviceFee,
    total: round2(subtotal + serviceFee),
    driverPayout: subtotal,
  };
}
