import { serverEnv } from "@/lib/runtime-env.server";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlBytes(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64Url(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function concat(...parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function rejectPrivateEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.port === "80") throw new Error("Invalid push endpoint");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "::1" || hostname.endsWith(".local")
    || /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) {
    throw new Error("Private push endpoint rejected");
  }
  return url;
}

async function hmac(key: Uint8Array, data: Uint8Array) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

async function encryptPayload(subscription: { p256dh: string; auth: string }, payload: Uint8Array) {
  const clientPublic = base64UrlBytes(subscription.p256dh);
  const authSecret = base64UrlBytes(subscription.auth);
  if (clientPublic.length !== 65 || clientPublic[0] !== 4 || authSecret.length < 16) throw new Error("Invalid browser push keys");
  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));
  const clientKey = await crypto.subtle.importKey("raw", clientPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeys.privateKey, 256));
  const keyInfo = concat(textEncoder.encode("WebPush: info\0"), clientPublic, serverPublic);
  const prk = await hmac(authSecret, shared);
  const ikm = await hkdf(prk, new Uint8Array(32), keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, textEncoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, textEncoder.encode("Content-Encoding: nonce\0"), 12);
  const contentKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concat(payload, new Uint8Array([2]));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, contentKey, padded));
  const header = new Uint8Array(21 + serverPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = serverPublic.length;
  header.set(serverPublic, 21);
  return concat(header, encrypted);
}

function derPrivateKey(raw: Uint8Array, publicKey: Uint8Array) {
  if (raw.length !== 32 || publicKey.length !== 65) throw new Error("VAPID keys must be base64url P-256 keys");
  return concat(
    new Uint8Array([0x30, 0x81, 0x87, 0x02, 0x01, 0x01, 0x04, 0x20]), raw,
    new Uint8Array([0xa0, 0x0a, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
      0xa1, 0x44, 0x03, 0x42, 0x00]), publicKey,
  );
}

async function vapidAuthorization(endpoint: URL) {
  const privateValue = serverEnv("WEB_PUSH_VAPID_PRIVATE_KEY");
  const publicValue = serverEnv("WEB_PUSH_VAPID_PUBLIC_KEY");
  const subject = serverEnv("WEB_PUSH_VAPID_SUBJECT");
  if (!privateValue || !publicValue || !subject) throw new Error("Web Push VAPID configuration is incomplete");
  const privateKey = await crypto.subtle.importKey("pkcs8", derPrivateKey(base64UrlBytes(privateValue), base64UrlBytes(publicValue)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(textEncoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = base64Url(textEncoder.encode(JSON.stringify({ aud: `${endpoint.protocol}//${endpoint.host}`, exp: now + 12 * 60 * 60, sub: subject })));
  const signingInput = textEncoder.encode(`${header}.${claims}`);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, signingInput);
  return `vapid t=${header}.${claims}.${base64Url(signature)}, k=${publicValue}`;
}

export type PushSubscriptionRecord = { endpoint: string; p256dh: string; auth: string };

export async function sendWebPush(subscription: PushSubscriptionRecord, payload: { title: string; body?: string; url?: string; tag?: string }) {
  const endpoint = rejectPrivateEndpoint(subscription.endpoint);
  const body = textEncoder.encode(JSON.stringify({ title: payload.title, body: payload.body ?? "", url: payload.url ?? "/notifications", tag: payload.tag ?? "share-barabara-notification" }));
  const encrypted = await encryptPayload(subscription, body);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(endpoint),
      TTL: "86400",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Urgency: "normal",
    },
    body: encrypted,
  });
  if (response.status === 404 || response.status === 410) return { ok: false, permanent: true, status: response.status };
  if (!response.ok) return { ok: false, permanent: false, status: response.status };
  return { ok: true, permanent: false, status: response.status };
}

export function retryAt(attempt: number, now = new Date()) {
  const bounded = Math.min(Math.max(attempt, 0), 7);
  return new Date(now.getTime() + Math.min(60 * 60_000, 30_000 * (2 ** bounded)));
}

export function isSafePushEndpoint(endpoint: string) {
  try { rejectPrivateEndpoint(endpoint); return true; } catch { return false; }
}
