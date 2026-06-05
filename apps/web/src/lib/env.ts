/**
 * Typed access to public runtime configuration. Centralised so a missing value
 * fails loudly in one place instead of producing `undefined` request URLs.
 */
function required(name: string, value: string | undefined, fallback?: string): string {
  const resolved = value ?? fallback;
  if (!resolved) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return resolved;
}

export const clientEnv = {
  /** API base URL, including the /api/v1 version prefix. */
  apiUrl: required(
    "NEXT_PUBLIC_API_URL",
    process.env.NEXT_PUBLIC_API_URL,
    "http://localhost:4000/api/v1",
  ),
  /** Display currency symbol. Domain is Indian pharmacy (GST/HSN), default ₹. */
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "₹",
};
