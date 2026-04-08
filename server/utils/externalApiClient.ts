import crypto from "crypto";

const EXTERNAL_API_TOKEN = process.env.EXTERNAL_API_TOKEN || "default_api_token";

/**
 * Utility to call external APIs securely using HMAC-SHA256 signature.
 * This should ONLY be used by the backend.
 */
export async function fetchExternalApi(url: string, options: RequestInit = {}) {
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', EXTERNAL_API_TOKEN).update(timestamp).digest('hex');

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${EXTERNAL_API_TOKEN}`,
    "x-timestamp": timestamp,
    "x-signature": signature,
    ...((options.headers as Record<string, string>) || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
