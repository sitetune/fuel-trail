export const brand = {
  name: "FuelTrail",
  tagline: "Every gallon. Every truck. One clear trail.",
  colors: {
    navy: "#0B1F33",
    amber: "#F5A524",
    road: "#5E6B75",
    success: "#198754",
    alert: "#C93C37",
    offWhite: "#F7F8FA",
  },
  defaults: {
    timezone: "America/Chicago",
    currency: "USD",
    tankCapacityGallons: 200,
    targetMpg: 6.5,
    weekStartMinGallons: 100,
    reserveGallons: 25,
    purchaseIncrementGallons: 5,
    retentionYears: 4,
  },
} as const;

export type BrandConfig = typeof brand;
