import Image from "next/image";

const screens = [
  {
    eyebrow: "Capture",
    title: "Scan the ticket before you roll",
    body: "Photograph the pump receipt in the cab. The original stays on file. A smaller copy is used only so review stays fast.",
    src: "/images/app-scan.webp",
    alt: "FuelTrail driver app scanning a Pilot fuel receipt",
    width: 1586,
    height: 992,
  },
  {
    eyebrow: "Confirm",
    title: "Home screen first. Then the numbers.",
    body: "Add a receipt for the assigned truck, see estimated fuel, and check recent stops. OCR fills gallons, station, and total. A person confirms. The receipt is the record.",
    src: "/images/app-receipts.webp",
    alt: "FuelTrail driver home with capture, estimated fuel, and a receipts list",
    width: 1536,
    height: 1024,
  },
  {
    eyebrow: "Complete",
    title: "Capture. Confirm. Complete.",
    body: "Three screens, one stop: use the photo, check eight fields, and send it in. Status stays visible so managers know what still needs review.",
    src: "/images/app-demo.webp",
    alt: "FuelTrail capture, confirm, and complete flow across three phone screens",
    width: 1536,
    height: 1024,
  },
];

export function DriverScreens() {
  return (
    <section id="how-it-works" className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-route uppercase">For drivers</p>
        <h2 className="mt-2 max-w-[22ch] font-display text-3xl font-semibold tracking-tight text-balance">
          Built for a truck cab, not a desk
        </h2>
        <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-steel">
          Large tap targets, a full-width capture button, and the original image on every stop.
        </p>
        <div className="mt-12 space-y-16">
          {screens.map((screen, index) => (
            <article
              key={screen.src}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            >
              <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-sky uppercase">{screen.eyebrow}</p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-balance">{screen.title}</h3>
                <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-steel">{screen.body}</p>
              </div>
              <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={screen.width}
                  height={screen.height}
                  className="w-full rounded-xl border border-white/10"
                  sizes="(min-width: 1024px) 40rem, 100vw"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
