export type ReverseAddress = {
  displayName?: string | null;
  houseNumber?: string | null;
  road?: string | null;
  suburb?: string | null;
  neighbourhood?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
};

const STATE_ABBREV: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

export function abbreviateState(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^[A-Z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return STATE_ABBREV[trimmed.toLowerCase()] ?? trimmed;
}

export function parseHighwayRef(text: string | null | undefined): string | null {
  if (!text) return null;
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/\bI(?:nterstate)?[\s-]*(\d+)\b/i, (m) => `I-${m[1]}`],
    [/\bU\.?S\.?[\s-]*(?:Hwy|Highway)?[\s-]*(\d+)\b/i, (m) => `US-${m[1]}`],
    [/\b(?:SH|State\s+Highway|TX)[\s-]*(\d+)\b/i, (m) => `SH ${m[1]}`],
    [/\b(?:FM|Farm[\s-]?to[\s-]?Market(?:\s+Road)?)[\s-]*(\d+)\b/i, (m) => `FM ${m[1]}`],
    [/\bHwy[\s-]*(\d+)\b/i, (m) => `Hwy ${m[1]}`],
  ];
  for (const [pattern, format] of patterns) {
    const match = text.match(pattern);
    if (match) return format(match);
  }
  return null;
}

export function parseExitRef(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\b(?:Exit|Ex)\s+(\d+[A-Z]?)\b/i);
  return match?.[1] ? `Exit ${match[1]}` : null;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

function overlaps(line: string, other: string | null) {
  if (!other) return false;
  const a = normalize(line);
  const b = normalize(other);
  return a === b || a.includes(b) || b.includes(a);
}

function streetFromReverse(reverse: ReverseAddress | null): string | null {
  if (!reverse) return null;
  const road = reverse.road?.trim();
  if (!road) return null;
  const number = reverse.houseNumber?.trim();
  return number ? `${number} ${road}` : road;
}

function localityFromParts(city: string | null | undefined, region: string | null | undefined) {
  const place = city?.trim() || null;
  const state = abbreviateState(region);
  return [place, state].filter(Boolean).join(", ") || null;
}

export function buildStopLocationHint(input: {
  name: string;
  addressLine?: string | null;
  locality?: string | null;
  reverse?: ReverseAddress | null;
}): { addressLine: string | null; highwayLine: string | null; locality: string | null } {
  const blobs = [
    input.addressLine,
    input.locality,
    input.reverse?.displayName,
    input.reverse?.road,
    input.reverse?.suburb,
    input.reverse?.neighbourhood,
  ]
    .filter(Boolean)
    .join(" · ");
  const street = input.addressLine?.trim() || streetFromReverse(input.reverse ?? null);
  const locality =
    input.locality?.trim() ||
    localityFromParts(input.reverse?.city, input.reverse?.state);
  const highway = parseHighwayRef(blobs);
  const exit = parseExitRef(blobs);
  const cross =
    [input.reverse?.suburb, input.reverse?.neighbourhood].find(
      (value) => value && !overlaps(value, street ?? "") && !overlaps(value, locality ?? "") && !overlaps(value, input.name),
    ) ?? null;
  const highwayAlreadyInStreet = Boolean(highway && street && parseHighwayRef(street) === highway);

  let highwayLine: string | null = null;
  if (highway && exit) highwayLine = `${highway} ${exit}`;
  else if (highway && cross) highwayLine = `${highway} at ${cross}`;
  else if (exit) highwayLine = exit;
  else if (highway && !highwayAlreadyInStreet) highwayLine = highway;

  const addressLine = street && !overlaps(street, input.name) ? street : null;
  const localityLine = locality && !overlaps(locality, input.name) && !overlaps(locality, addressLine ?? "") ? locality : null;

  return {
    addressLine,
    highwayLine,
    locality: localityLine,
  };
}
