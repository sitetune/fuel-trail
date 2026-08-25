export type MapsLinks = {
  google: string;
  apple: string;
  waze: string;
  geo: string;
};

export function buildMapsLinks(input: { lat: number; lng: number; label: string }): MapsLinks {
  const dest = `${input.lat},${input.lng}`;
  const query = encodeURIComponent(input.label);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`,
    apple: `https://maps.apple.com/?daddr=${dest}&q=${query}&dirflg=d`,
    waze: `https://waze.com/ul?ll=${dest}&navigate=yes&q=${query}`,
    geo: `geo:${dest}?q=${dest}(${query})`,
  };
}
