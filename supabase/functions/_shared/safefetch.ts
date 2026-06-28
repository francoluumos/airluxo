// SSRF-guarded image fetch. The ingest pipeline downloads images whose URLs come from
// a partner's website (branding logo, page/crawl images) — i.e. attacker-influenceable.
// Block anything that could reach internal/metadata endpoints, and only accept https
// image responses under a size cap, refusing redirects (which could bounce to internal).

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const PRIVATE_V4 = [
  /^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
];

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const l = ip.toLowerCase().replace(/^\[|\]$/g, "");
    return l === "::1" || l === "::" || l === "0:0:0:0:0:0:0:1" ||
      l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") ||
      l.startsWith("::ffff:") || l.startsWith("::");
  }
  return PRIVATE_V4.some((re) => re.test(ip));
}

const BLOCKED_HOSTS = /(^|\.)(localhost|local|internal|lan|home|corp)$|^metadata\.|(^|\.)internal\./i;
const isIpLiteral = (h: string) => /^[\d.]+$/.test(h) || h.includes(":");

// Returns true only if the host is safe to fetch. Resolves DNS when the runtime supports
// it (catches a domain pointing at a private IP); if Deno.resolveDns is unavailable, the
// literal/host checks above still block the practical metadata/loopback vectors.
export async function hostIsPublic(host: string): Promise<boolean> {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h) return false;
  if (isIpLiteral(h)) return !isPrivateIp(h);
  if (BLOCKED_HOSTS.test(h)) return false;
  try {
    const resolve = (Deno as any).resolveDns;
    if (typeof resolve !== "function") return false; // can't verify → fail closed
    const a = await resolve(h, "A").catch(() => [] as string[]);
    const aaaa = await resolve(h, "AAAA").catch(() => [] as string[]);
    const ips = [...a, ...aaaa];
    if (ips.length === 0) return false; // can't resolve → fail closed
    return ips.every((ip: string) => !isPrivateIp(ip));
  } catch {
    return false; // fail closed
  }
}

// Fetch an image with SSRF guards. Returns the bytes + content-type, or null if the URL
// is unsafe / not an image / too large / a redirect.
export async function fetchImageSafe(srcUrl: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  let u: URL;
  try { u = new URL(srcUrl); } catch { return null; }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (!(await hostIsPublic(u.hostname))) return null;

  let r: Response;
  try { r = await fetch(u.toString(), { redirect: "manual" }); } catch { return null; }
  if (r.status >= 300 && r.status < 400) return null; // refuse redirects (could target internal)
  if (!r.ok) return null;

  const ct = r.headers.get("content-type") || "";
  if (!/^image\//i.test(ct)) return null;
  const len = Number(r.headers.get("content-length") || 0);
  if (len && len > MAX_BYTES) return null;

  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
  return { bytes, contentType: ct };
}

// SSRF-guarded fetch for arbitrary (non-image) bytes — e.g. a third-party video URL.
// Same guards as fetchImageSafe (https-only, no creds, public host, no redirects),
// plus a caller-supplied size cap that is enforced both via content-length and on the
// actual bytes. Returns null if the URL is unsafe / too large / not OK.
export async function fetchBytesSafe(
  srcUrl: string,
  opts: { maxBytes: number } = { maxBytes: MAX_BYTES },
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  let u: URL;
  try { u = new URL(srcUrl); } catch { return null; }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (!(await hostIsPublic(u.hostname))) return null;

  let r: Response;
  try { r = await fetch(u.toString(), { redirect: "manual" }); } catch { return null; }
  if (r.status >= 300 && r.status < 400) return null; // refuse redirects (could target internal)
  if (!r.ok) return null;

  const len = Number(r.headers.get("content-length") || 0);
  if (len && len > opts.maxBytes) return null;

  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > opts.maxBytes) return null;
  const contentType = (r.headers.get("content-type") || "").split(";")[0] || "application/octet-stream";
  return { bytes, contentType };
}
