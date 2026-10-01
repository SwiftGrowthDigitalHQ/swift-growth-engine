export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  appSecret: string;
  apiVersion: string;
  webhookUrl: string;
  workerSecret: string;
}

export function getWhatsAppConfig(): Partial<WhatsAppConfig> {
  return {
    accessToken: Deno.env.get("WHATSAPP_ACCESS_TOKEN") || undefined,
    phoneNumberId: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || undefined,
    businessAccountId: Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID") || undefined,
    verifyToken: Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") || undefined,
    appSecret: Deno.env.get("META_APP_SECRET") || undefined,
    apiVersion: Deno.env.get("WHATSAPP_API_VERSION") || undefined,
    webhookUrl: Deno.env.get("WHATSAPP_WEBHOOK_PUBLIC_URL") || undefined,
    workerSecret: Deno.env.get("WHATSAPP_WORKER_SECRET") || undefined,
  };
}

export function graphApiBase(version: string): string {
  if (!/^v\d+\.\d+$/.test(version)) throw new Error("Invalid WhatsApp Graph API version configuration");
  return `https://graph.facebook.com/${version}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeRecipient(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return /^[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function toIsoFromUnixSeconds(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyMetaSignature(body: Uint8Array, signature: string | null, appSecret: string): Promise<boolean> {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  const supplied = signature.slice("sha256=".length).toLowerCase();
  const expectedHex = [...expected].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  let difference = supplied.length ^ expectedHex.length;
  for (let index = 0; index < expectedHex.length; index++) {
    difference |= expectedHex.charCodeAt(index) ^ (supplied.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function errorDetails(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return { message: "Meta API request failed" };
  const result: Record<string, unknown> = {};
  for (const key of ["message", "type", "code", "error_subcode", "fbtrace_id", "error_data"] as const) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}
