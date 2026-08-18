import { z } from "zod";
import { emptyExtraction, field, type NormalizedReceiptExtraction, type ReceiptOcrInput, type ReceiptOcrProvider } from "./types";
import { enrichExtraction } from "./parse-text";

const visionSchema = z.object({
  merchantName: z.string().nullable().optional(),
  merchantAddress: z.string().nullable().optional(),
  merchantCity: z.string().nullable().optional(),
  merchantRegion: z.string().nullable().optional(),
  merchantPostalCode: z.string().nullable().optional(),
  purchasedAt: z.string().nullable().optional(),
  receiptNumber: z.string().nullable().optional(),
  gallons: z.number().nullable().optional(),
  pricePerGallon: z.number().nullable().optional(),
  subtotalAmount: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  fuelType: z.string().nullable().optional(),
  warnings: z.array(z.string()).optional(),
});

const VISION_PROMPT = `You are reading a United States truck diesel fuel receipt photo.
Return JSON only with these keys:
merchantName, merchantAddress, merchantCity, merchantRegion, merchantPostalCode,
purchasedAt, receiptNumber, gallons, pricePerGallon, subtotalAmount, taxAmount, totalAmount, fuelType, warnings.

Rules:
- merchantName is the truck stop brand (Pilot, Love's, TA, Petro, Flying J), not a slogan like "fuel and go".
- merchantRegion is a 2-letter US state or Canadian province.
- purchasedAt is the date/time PRINTED on the receipt as YYYY-MM-DDTHH:mm:ss. Never use today's date. If no time is printed, use T12:00:00.
- receiptNumber is Receipt # or Transaction #, never a federal EIN / FED ID.
- If tractor diesel and reefer/DEF appear, gallons is the SUM of fuel gallon lines that make up the receipt total (include reefer diesel, exclude DEF if it is a separate non-diesel product).
- pricePerGallon is the printed pump price per gallon, not total divided by a single line.
- totalAmount is the receipt Total, not a single line item.
- fuelType is diesel unless the ticket is clearly gasoline only.
- Use null when a value is not visible. Do not guess.`;

function toExtraction(raw: unknown, provider: string): NormalizedReceiptExtraction {
  const parsed = visionSchema.safeParse(raw);
  if (!parsed.success) {
    return emptyExtraction(provider, [
      "The receipt reader returned an unexpected result. Enter fields from the photo.",
    ]);
  }
  const data = parsed.data;
  const region = data.merchantRegion ? data.merchantRegion.trim().toUpperCase().slice(0, 2) : null;
  return enrichExtraction({
    merchantName: field(clean(data.merchantName), data.merchantName ? 0.86 : null),
    merchantAddress: field(clean(data.merchantAddress), data.merchantAddress ? 0.82 : null),
    merchantCity: field(clean(data.merchantCity), data.merchantCity ? 0.84 : null),
    merchantRegion: field(region, region ? 0.9 : null),
    merchantPostalCode: field(clean(data.merchantPostalCode), data.merchantPostalCode ? 0.88 : null),
    purchasedAt: field(normalizeVisionDate(data.purchasedAt), data.purchasedAt ? 0.86 : null),
    receiptNumber: field(clean(data.receiptNumber), data.receiptNumber ? 0.8 : null),
    gallons: field(data.gallons ?? null, data.gallons ? 0.88 : null),
    pricePerGallon: field(data.pricePerGallon ?? null, data.pricePerGallon ? 0.86 : null),
    subtotalAmount: field(data.subtotalAmount ?? null, data.subtotalAmount ? 0.7 : null),
    taxAmount: field(data.taxAmount ?? null, data.taxAmount ? 0.7 : null),
    totalAmount: field(data.totalAmount ?? null, data.totalAmount ? 0.9 : null),
    fuelType: field(data.fuelType ?? "diesel", 0.7),
    purchaserName: field<string>(null, null),
    rawText: null,
    overallConfidence: 0.86,
    provider,
    providerDocumentId: null,
    warnings: data.warnings ?? ["Confirm every value against the receipt photo before submitting."],
  });
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeVisionDate(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.length >= 19 ? trimmed.slice(0, 19) : `${trimmed.slice(0, 16)}:00`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseJsonContent(text: string) {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(stripped) as unknown;
}

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

export class GeminiReceiptOcrProvider implements ReceiptOcrProvider {
  constructor(private readonly apiKey: string) {}

  async analyze(input: ReceiptOcrInput): Promise<NormalizedReceiptExtraction> {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError = "Gemini could not read this receipt.";
    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: VISION_PROMPT },
                  {
                    inline_data: {
                      mime_type: input.mimeType || "image/jpeg",
                      data: bytesToBase64(input.bytes),
                    },
                  },
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json", temperature: 0 },
          }),
        },
      );
      if (response.status === 404) continue;
      if (!response.ok) {
        lastError = "Gemini could not read this receipt. Enter the fields from the photo.";
        break;
      }
      const json = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      try {
        return toExtraction(parseJsonContent(text), "gemini");
      } catch {
        lastError = "Gemini returned text that could not be parsed.";
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
      return toExtraction(parseJsonContent(json.choices?.[0]?.message?.content ?? "{}"), "openai");
    } catch {
      return emptyExtraction("openai", ["OpenAI returned text that could not be parsed."]);
    }
  }
}
