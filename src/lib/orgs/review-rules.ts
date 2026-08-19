export type ReviewRules = {
  requireOdometer: boolean;
  requireReceiptNumber: boolean;
  requirePaymentLast4: boolean;
  requireTankLevel: boolean;
};

const EMPTY: ReviewRules = {
  requireOdometer: false,
  requireReceiptNumber: false,
  requirePaymentLast4: false,
  requireTankLevel: false,
};

export function parseReviewRules(value: unknown): ReviewRules {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    requireOdometer: Boolean(raw.require_odometer ?? raw.requireOdometer),
    requireReceiptNumber: Boolean(raw.require_receipt_number ?? raw.requireReceiptNumber),
    requirePaymentLast4: Boolean(raw.require_payment_last4 ?? raw.requirePaymentLast4),
    requireTankLevel: Boolean(raw.require_tank_level ?? raw.requireTankLevel),
  };
}

export function serializeReviewRules(rules: ReviewRules) {
  return {
    require_odometer: rules.requireOdometer,
    require_receipt_number: rules.requireReceiptNumber,
    require_payment_last4: rules.requirePaymentLast4,
    require_tank_level: rules.requireTankLevel,
  };
}

export function defaultReviewRules() {
  return { ...EMPTY };
}
