import { Check, Receipt } from "@phosphor-icons/react/ssr";

const bars = [
  { day: "M", height: 18 },
  { day: "T", height: 28 },
  { day: "W", height: 22 },
  { day: "T", height: 36 },
  { day: "F", height: 48 },
  { day: "S", height: 20 },
  { day: "S", height: 14 },
];

export function HeroScene() {
  return (
    <div className="absolute inset-0">
      <picture>
        <source media="(max-width: 767px)" srcSet="/images/hero-truck-mobile.webp" type="image/webp" />
        <img
          src="/images/hero-truck.webp"
          alt="Blue semi-truck fueling at a night station"
          width={3434}
          height={1832}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[68%_center] sm:object-[72%_40%]"
        />
      </picture>
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink from-[8%] via-ink/55 via-[38%] to-transparent to-[70%]"
        aria-hidden="true"
      />
      <article className="absolute top-[12%] right-[36%] z-[1] hidden w-52 rounded-xl border border-sky/35 bg-ink/75 p-3.5 shadow-[0_12px_32px_rgba(11,23,40,0.35)] backdrop-blur-md md:block lg:right-[40%] lg:top-[16%]">
        <div className="flex items-start gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-route/20 text-sky">
            <Receipt size={18} weight="regular" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-warm/80">Receipt captured</p>
            <p className="font-display text-xl font-semibold tabular-nums tracking-tight text-warm">$523.67</p>
            <p className="text-[11px] text-sky">Diesel</p>
          </div>
        </div>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-route px-2 py-0.5 text-[11px] font-medium text-white">
          <Check size={12} weight="bold" />
          Verified
        </span>
      </article>
      <article className="absolute right-[6%] bottom-[22%] z-[1] hidden w-56 rounded-xl border border-sky/30 bg-ink/78 p-3.5 shadow-[0_12px_32px_rgba(11,23,40,0.35)] backdrop-blur-md md:block lg:right-[8%] lg:bottom-[26%]">
        <p className="text-[11px] font-medium text-warm/75">Truck 24 · This week</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="font-display text-xl font-semibold tabular-nums tracking-tight text-warm">$1,423.18</p>
          <p className="text-[11px] font-medium text-sky">▼ 8.4%</p>
        </div>
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {bars.map((bar, index) => (
            <div key={`${bar.day}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className="w-full rounded-[3px] bg-sky shadow-[0_0_12px_rgba(102,183,255,0.55)]"
                style={{ height: bar.height }}
              />
              <span className="text-[9px] leading-none text-steel">{bar.day}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
