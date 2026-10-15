/** Card (Whop/Visa) checkout carries a 7% processing fee, added on top of the
 *  plan price at checkout. It is deliberately NOT folded into the order's
 *  charge_amount: that value drives invoicing and split-payment installments,
 *  which must stay based on the actual plan price. */
export const VISA_FEE_RATE = 0.07

export function withVisaFee(amount: number): number {
  return Math.round(amount * (1 + VISA_FEE_RATE) * 100) / 100
}
