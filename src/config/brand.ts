export const brand = {
  name: "FuelTrail",
  tagline: "Smarter fuel decisions. Further.",
  valueLine: "Capture receipts. Manage trucks. Analyze spending. Find savings.",
  colors: {
    navy: "#0B1728",
    ink: "#0B1728",
    route: "#176BFF",
    steel: "#AAB5C4",
    muted: "#4E5C6B",
    warm: "#F6F5F1",
    success: "#1F8A5B",
    alert: "#C4453C",
    offWhite: "#F6F5F1",
    /** @deprecated Use route. Kept so older imports keep compiling. */
    amber: "#176BFF",
    road: "#4E5C6B",
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
