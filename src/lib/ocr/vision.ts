import { emptyExtraction, field, type NormalizedReceiptExtraction, type ReceiptOcrInput, type ReceiptOcrProvider } from "./types";
import { enrichExtraction, extractionHasValues } from "./parse-text";

const STATE_BY_NAME: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA",
  michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

const VISION_PROMPT = `You are reading a United States truck diesel fuel receipt photo.
Return one JSON object, not an array. Use exactly these keys:
merchantName, merchantAddress, merchantCity, merchantRegion, merchantPostalCode,
purchasedAt, receiptNumber, gallons, pricePerGallon, subtotalAmount, taxAmount, totalAmount, fuelType.

Rules:
- merchantName is the truck stop brand (Pilot, Love's, TA, Petro, Flying J), not a slogan like "fuel and go".
- merchantAddress is the street line only.
- merchantCity is the city name only.
- merchantRegion MUST be a 2-letter US state or Canadian province code such as MI or TN, never a full name.
- merchantPostalCode is the ZIP or postal code as a string.
- purchasedAt is the date/time PRINTED on the receipt as YYYY-MM-DDTHH:mm:ss. Never use today's date. If no time is printed, use T12:00:00.
- receiptNumber is Receipt # or Transaction # as a string, never a federal EIN / FED ID.
- gallons, pricePerGallon, subtotalAmount, taxAmount, and totalAmount must be JSON numbers with no $ or unit text.
- If tractor diesel and reefer appear, gallons is the SUM of those fuel gallon lines. Exclude DEF.
- pricePerGallon is the printed pump price per gallon.
- totalAmount is the receipt Total.
- fuelType is diesel unless the ticket is clearly gasoline only.
- Use null when a value is not visible. Do not guess. Do not add other keys.`;

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "object" && value && "value" in value) return asString((value as { value: unknown }).value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value && "value" in value) return asNumber((value as { value: unknown }).value);
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRegion(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  const compact = text.replace(/\./g, "").trim();
  const token = compact.split(/[\s,/]+/)[0] ?? "";
  if (/^[A-Za-z]{2}$/.test(token)) return token.toUpperCase();
  return STATE_BY_NAME[compact.toLowerCase()] ?? STATE_BY_NAME[token.toLowerCase()] ?? null;
}

function unwrapVisionPayload(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw)) return unwrapVisionPayload(raw[0]);
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const hasDirect =
    record.merchantName != null ||
    record.merchant_name != null ||
    record.merchant != null ||
    record.gallons != null ||
    record.totalAmount != null ||
    record.total_amount != null ||
    record.total != null;
  if (hasDirect) return record;
  for (const key of ["receipt", "data", "result", "extraction", "fields", "output"]) {
    if (record[key] != null) {
      const nested = unwrapVisionPayload(record[key]);
      if (nested) return nested;
    }
  }
  return record;
}

function toSnake(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function pickAlias(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] != null) return record[key];
    const snake = toSnake(key);
    if (snake !== key && record[snake] != null) return record[snake];
  }
  return null;
}

function valued<T>(value: T | null, confidence: number) {
  return field(value, value != null ? confidence : null);
}

export function visionPayloadToExtraction(raw: unknown, provider = "gemini"): NormalizedReceiptExtraction {
  const record = unwrapVisionPayload(raw);
  if (!record) {
    return emptyExtraction(provider, [
      "The receipt reader returned an unexpected result. Enter fields from the photo.",
    ]);
  }
  const gallons = asNumber(pickAlias(record, ["gallons", "gallonQty", "fuelGallons"]));
  const totalAmount = asNumber(pickAlias(record, ["totalAmount", "total", "grandTotal"]));
  const fuelType = asString(pickAlias(record, ["fuelType"])) ?? "diesel";
  const extraction = {
    merchantName: valued(asString(pickAlias(record, ["merchantName", "merchant", "supplierName"])), 0.86),
    merchantAddress: valued(asString(pickAlias(record, ["merchantAddress", "address", "street"])), 0.82),
    merchantCity: valued(asString(pickAlias(record, ["merchantCity", "city"])), 0.84),
    merchantRegion: valued(asRegion(pickAlias(record, ["merchantRegion", "region", "state", "province"])), 0.9),
    merchantPostalCode: valued(asString(pickAlias(record, ["merchantPostalCode", "postalCode", "zip", "zipCode"])), 0.88),
    purchasedAt: valued(
      normalizeVisionDate(asString(pickAlias(record, ["purchasedAt", "date", "datetime"]))),
      0.86,
    ),
    receiptNumber: valued(
      asString(pickAlias(record, ["receiptNumber", "receiptNo", "transactionNumber", "transactionId"])),
      0.8,
    ),
    gallons: valued(gallons, 0.88),
    pricePerGallon: valued(asNumber(pickAlias(record, ["pricePerGallon", "ppg", "unitPrice"])), 0.86),
    subtotalAmount: valued(asNumber(pickAlias(record, ["subtotalAmount", "subtotal"])), 0.7),
    taxAmount: valued(asNumber(pickAlias(record, ["taxAmount", "tax"])), 0.7),
    totalAmount: valued(totalAmount, 0.9),
    fuelType: valued(fuelType, 0.7),
    purchaserName: field<string>(null, null),
    rawText: null,
    overallConfidence: 0.86,
    provider,
    providerDocumentId: null,
    warnings: ["Confirm every value against the receipt photo before submitting."],
  };
  if (!extractionHasValues(extraction)) {
    return emptyExtraction(provider, [
      "The receipt reader returned an unexpected result. Enter fields from the photo.",
    ]);
  }
  return enrichExtraction(extraction);
}

function toExtraction(raw: unknown, provider: string): NormalizedReceiptExtraction {
  return visionPayloadToExtraction(raw, provider);
}

function normalizeVisionDate(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T12:00:00`;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/.test(trimmed)) {
    const normalized = trimmed.replace(" ", "T");
    return normalized.length >= 19 ? normalized.slice(0, 19) : `${normalized.slice(0, 16)}:00`;
  }
  const us = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (us) {
    let year = Number(us[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const month = Number(us[1]);
    const day = Number(us[2]);
    let hour = us[4] ? Number(us[4]) : 12;
    const minute = us[5] ? Number(us[5]) : 0;
    const second = us[6] ? Number(us[6]) : 0;
    const meridiem = us[7]?.toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseJsonContent(text: string) {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(stripped) as unknown;
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(stripped.slice(start, end + 1)) as unknown;
      return Array.isArray(parsed) ? parsed[0] : parsed;
    }
    throw new Error("Gemini returned text that could not be parsed.");
  }
}

const VISION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    merchantName: { type: ["string", "null"] },
    merchantAddress: { type: ["string", "null"] },
    merchantCity: { type: ["string", "null"] },
    merchantRegion: { type: ["string", "null"] },
    merchantPostalCode: { type: ["string", "null"] },
    purchasedAt: { type: ["string", "null"] },
    receiptNumber: { type: ["string", "null"] },
    gallons: { type: ["number", "null"] },
    pricePerGallon: { type: ["number", "null"] },
    subtotalAmount: { type: ["number", "null"] },
    taxAmount: { type: ["number", "null"] },
    totalAmount: { type: ["number", "null"] },
    fuelType: { type: ["string", "null"] },
  },
  required: [
    "merchantName",
    "merchantAddress",
    "merchantCity",
    "merchantRegion",
    "merchantPostalCode",
    "purchasedAt",
    "receiptNumber",
    "gallons",
    "pricePerGallon",
    "subtotalAmount",
    "taxAmount",
    "totalAmount",
    "fuelType",
  ],
};

function visionMimeType(mimeType: string | undefined) {
  const mime = (mimeType || "image/jpeg").toLowerCase();
  if (mime === "image/jpg") return "image/jpeg";
  return mime || "image/jpeg";
}

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function geminiRequestBody(input: ReceiptOcrInput, withSchema: boolean) {
  return {
    contents: [
      {
        parts: [
          { text: VISION_PROMPT },
          {
            inlineData: {
              mimeType: visionMimeType(input.mimeType),
              data: bytesToBase64(input.bytes),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      ...(withSchema ? { responseJsonSchema: VISION_RESPONSE_SCHEMA } : {}),
    },
  };
}

function geminiAuthHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };
}

function describeGeminiError(status: number, body: unknown) {
  const error =
    body && typeof body === "object"
      ? (body as { error?: { status?: string; message?: string } }).error
      : undefined;
  if (status === 401 || status === 403) {
    return "Gemini rejected the API key. Confirm GEMINI_API_KEY on Vercel.";
  }
  if (status === 429) {
    return "Gemini rate-limited this request. Wait a moment and scan again.";
  }
  if (status === 503 || error?.status === "UNAVAILABLE") {
    return "Gemini is busy. Try scanning again in a few seconds.";
  }
  if (status === 404) {
    return "Gemini model was not found for this key.";
  }
  return error?.message?.slice(0, 180) || "Gemini could not read this receipt. Enter the fields from the photo.";
}

export class GeminiReceiptOcrProvider implements ReceiptOcrProvider {
  constructor(private readonly apiKey: string) {}

  async analyze(input: ReceiptOcrInput): Promise<NormalizedReceiptExtraction> {
    const models = [
      process.env.GEMINI_MODEL,
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-flash-lite-latest",
    ].filter((model, index, list): model is string => Boolean(model) && list.indexOf(model) === index);

    let lastError = "Gemini could not read this receipt.";
    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        let response: Response;
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: geminiAuthHeaders(this.apiKey),
              body: JSON.stringify(geminiRequestBody(input, attempt === 0)),
            },
          );
        } catch (error) {
          lastError =
            error instanceof Error && /fetch|network|ENOTFOUND|ECONN/i.test(error.message)
              ? "Gemini is unreachable right now. Check the API key and try again."
              : `Gemini request failed: ${error instanceof Error ? error.message.slice(0, 160) : "unknown error"}`;
          break;
        }

        const json = (await response.json().catch(() => ({}))) as {
          error?: { status?: string; message?: string };
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };

        if (response.status === 404) {
          lastError = describeGeminiError(response.status, json);
          break;
        }
        if (response.status === 503 || json.error?.status === "UNAVAILABLE") {
          lastError = describeGeminiError(response.status, json);
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          continue;
        }
        if (!response.ok) {
          lastError = describeGeminiError(response.status, json);
          if (response.status === 401 || response.status === 403) {
            return emptyExtraction("gemini", [lastError]);
          }
          if (response.status === 400 && attempt === 0) {
            continue;
          }
          break;
        }

        const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
        try {
          const raw = parseJsonContent(text);
          const extracted = toExtraction(raw, "gemini");
          extracted.providerRaw = raw;
          return extracted;
        } catch {
          lastError = "Gemini returned text that could not be parsed.";
          break;
        }
      }
    }
    return emptyExtraction("gemini", [lastError]);
  }
}

export class OpenAiReceiptOcrProvider implements ReceiptOcrProvider {
  constructor(private readonly apiKey: string) {}

  async analyze(input: ReceiptOcrInput): Promise<NormalizedReceiptExtraction> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VISION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType || "image/jpeg"};base64,${bytesToBase64(input.bytes)}`,
                },
              },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      return emptyExtraction("openai", [
        "OpenAI could not read this receipt. Enter the fields from the photo.",
      ]);
    }
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    try {
      const extracted = toExtraction(parseJsonContent(json.choices?.[0]?.message?.content ?? "{}"), "openai");
      extracted.providerRaw = json.choices?.[0]?.message?.content ?? null;
      return extracted;
    } catch {
      return emptyExtraction("openai", ["OpenAI returned text that could not be parsed."]);
    }
  }
}
