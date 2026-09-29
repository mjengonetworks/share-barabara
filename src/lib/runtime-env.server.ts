type RuntimeEnv = Record<string, string | undefined>;

/** Reads Cloudflare Worker bindings first, with local Node development support. */
export function serverEnv(name: string) {
  const cloudflareEnv = (globalThis as typeof globalThis & { __env__?: RuntimeEnv }).__env__;
  return cloudflareEnv?.[name] ?? process.env[name];
}
