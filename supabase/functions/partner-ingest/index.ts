// AIRLUXO — partner-ingest
// From a prospect's website URL, extract a brand kit (colours/fonts/logo), USP + page
// copy, a tech-stack read (CMS / payments / booking tool), a full-page screenshot, and
// the car images — via Firecrawl (v2). Ready immediately after the homepage scrape; the
// fleet path is crawled asynchronously and folded in by partner-ingest-poll.
//
// verify_jwt OFF — auth checked here (admin JWT OR service-role key).
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY, GEMINI_API_KEY.
// Body: { partner_id, url }  →  { job }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchImageSafe } from "../_shared/safefetch.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const FC = "https://api.firecrawl.dev";
const MAX_HOMEPAGE_IMAGES = 24;

function normUrl(raw: string): string | null {
  let u = String(raw || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).toString(); } catch { return null; }
}

// Fleet/inventory path heuristics across CH languages (DE/FR/IT/EN).
const FLEET_RE = /\/(fleet|cars?|vehicles?|fahrzeuge?|flotte|autos?|veicoli|voitures?|rent(al)?|miete?n|location|noleggio|collection|garage|modelle?|models?)\b/i;

// Skip logos/icons/sprites/tiny assets. Also drops Wix lazy-load placeholders (blur_*)
// and small thumbnails (w_<400) that are not real photos.
function isLikelyPhoto(u: string): boolean {
  if (!u || u.startsWith("data:")) return false;
  if (/\.svg(\?|$)/i.test(u)) return false;
  if (/(sprite|icon|logo|favicon|placeholder|avatar|badge|flag|pixel|spacer)/i.test(u)) return false;
  if (/blur_\d/i.test(u)) return false;
  const w = u.match(/w_(\d{2,4})/i);
  if (w && Number(w[1]) < 400) return false;
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) || /(format=|fit=|w=\d|width=)/i.test(u);
}

// Chunked base64 (String.fromCharCode(...big) overflows the call stack).
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  return btoa(bin);
}

// Google Fonts stylesheet URL from family names (so the partner's fonts load; allowlisted host).
function googleFontsUrl(families: string[]): string {
  const uniq = Array.from(new Set(families.map((f) => (f || "").trim()).filter((f) => f.length > 0)));
  if (uniq.length === 0) return "";
  const params = uniq.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;600;700").join("&");
  return "https://fonts.googleapis.com/css2?" + params + "&display=swap";
}

// Gemini call (forced JSON). prompt-only, or with an inline image for vision.
async function geminiJson(apiKey: string, prompt: string, image?: { mime: string; b64: string }): Promise<any | null> {
  const parts: any[] = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.b64 } });
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: "application/json" } }),
    });
    if (!r.ok) return null;
    const g = await r.json();
    const txt = (g?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "").trim();
    const m = txt.replace(/```json|```/gi, "").match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; } finally { clearTimeout(to); }
}

// Best-effort tech-stack read from the homepage rawHtml + links + metadata.
function detectTechStack(html: string, links: string[], generator: string): Record<string, unknown> {
  const h = (html || "").toLowerCase();
  const allLinks = (links || []).join(" ").toLowerCase();
  const gen = (generator || "").toLowerCase();
  const has = (s: string) => h.includes(s) || allLinks.includes(s);

  let cms: string | null = null;
  if (gen.includes("wordpress") || has("/wp-content/") || has("wp-json")) cms = "WordPress";
  else if (gen.includes("wix") || has("wix.com") || has("parastorage")) cms = "Wix";
  else if (gen.includes("squarespace") || has("squarespace")) cms = "Squarespace";
  else if (has("webflow")) cms = "Webflow";
  else if (has("framerusercontent") || has("framer.com")) cms = "Framer";
  else if (gen.includes("shopify") || has("cdn.shopify.com") || has("myshopify")) cms = "Shopify";
  else if (gen.includes("jimdo") || has("jimdo")) cms = "Jimdo";
  else if (gen.includes("joomla")) cms = "Joomla";
  else if (gen.includes("typo3")) cms = "TYPO3";
  else if (has("_next/") || has("__next")) cms = "Next.js (headless)";

  const payments: string[] = [];
  if (has("js.stripe.com") || has("stripe.com/v3")) payments.push("Stripe");
  if (has("paypal.com") || has("paypalobjects")) payments.push("PayPal");
  if (has("datatrans")) payments.push("Datatrans");
  if (has("wallee")) payments.push("Wallee");
  if (has("payrexx")) payments.push("Payrexx");
  if (has("klarna")) payments.push("Klarna");
  if (has("twint")) payments.push("TWINT");

  let booking: string | null = null;
  if (has("calendly")) booking = "Calendly";
  else if (has("rentcentric") || has("rentall") || has("hq-rental") || has("rentle")) booking = "Rental booking widget";
  else if (/(book|reserv|miete|noleggi)/i.test(allLinks)) booking = "Custom booking flow";

  const analytics: string[] = [];
  if (has("googletagmanager") || has("google-analytics") || has("gtag")) analytics.push("Google Analytics");
  if (has("hotjar")) analytics.push("Hotjar");
  if (has("facebook.com/tr") || has("connect.facebook.net")) analytics.push("Meta Pixel");

  const ecommerce = has("woocommerce") ? "WooCommerce" : (cms === "Shopify" ? "Shopify" : null);
  return { cms, booking, payments, analytics, ecommerce, detected_at: new Date().toISOString() };
}

async function persistAsset(admin: any, bucket: string, path: string, srcUrl: string): Promise<string | null> {
  const img = await fetchImageSafe(srcUrl);
  if (!img) return null;
  const { error } = await admin.storage.from(bucket).upload(path, img.bytes, { contentType: img.contentType, upsert: true });
  if (error) return null;
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let jobId: string | null = null;
  let admin: any = null;
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let authed = bearer && bearer === serviceKey;
    if (!authed && bearer) {
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const sc = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
        const { data: adm } = await sc.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
        authed = !!adm;
      }
    }
    if (!authed) return json({ error: "Not authorized" }, 401);

    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!fcKey) return json({ error: "FIRECRAWL_API_KEY is not configured" }, 500);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "").trim();
    const url = normUrl(body.url);
    if (!partnerId) return json({ error: "partner_id required" }, 400);
    if (!url) return json({ error: "a valid url is required" }, 400);

    admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const fcHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${fcKey}` };

    const { data: job, error: jErr } = await admin.from("partner_ingest_jobs")
      .insert({ partner_id: partnerId, url, status: "scraping" }).select().single();
    if (jErr) return json({ error: jErr.message }, 500);
    jobId = job.id;

    // 1) Map → homepage + fleet path.
    let fleetUrl: string | null = null;
    let mapLinks: string[] = [];
    try {
      const mapRes = await fetch(`${FC}/v2/map`, { method: "POST", headers: fcHeaders, body: JSON.stringify({ url, limit: 200 }) });
      if (mapRes.ok) {
        const mj = await mapRes.json();
        mapLinks = (mj.links || mj.data?.links || []).map((l: any) => (typeof l === "string" ? l : l.url)).filter(Boolean);
        fleetUrl = mapLinks.find((l: string) => FLEET_RE.test(l)) || null;
      }
    } catch { /* best-effort */ }

    // 2) Scrape the homepage — branding + USP json + screenshot + images.
    const uspSchema = {
      type: "object",
      properties: {
        usp: { type: "string" }, about: { type: "string" },
        benefits: { type: "array", items: { type: "string" } },
        services: { type: "array", items: { type: "string" } },
        contact: { type: "object", properties: { email: { type: "string" }, phone: { type: "string" }, address: { type: "string" } } },
      },
    };
    const scrapeRes = await fetch(`${FC}/v2/scrape`, {
      method: "POST", headers: fcHeaders,
      body: JSON.stringify({
        url,
        formats: ["markdown", "links", "rawHtml", "branding", "images", { type: "screenshot", fullPage: true },
          { type: "json", schema: uspSchema, prompt: "Extract the company's USP, about text, key benefits, services and contact details." }],
      }),
    });
    if (!scrapeRes.ok) {
      const msg = `Firecrawl scrape ${scrapeRes.status}: ${(await scrapeRes.text()).slice(0, 200)}`;
      await admin.from("partner_ingest_jobs").update({ status: "failed", error: msg }).eq("id", jobId);
      return json({ error: msg }, 502);
    }
    const sj = await scrapeRes.json();
    const d = sj.data || sj;
    const branding = d.branding || {};

    // Persist the screenshot + keep bytes for the vision colour read.
    let screenshotUrl: string | null = null;
    let shotB64: string | null = null;
    let shotMime = "image/png";
    const shotSrc = d.screenshot || d.screenshotUrl || (Array.isArray(d.actions?.screenshots) ? d.actions.screenshots[0] : null);
    if (shotSrc) {
      const img = await fetchImageSafe(shotSrc);
      if (img) {
        shotMime = img.contentType;
        if (img.bytes.length <= 5_000_000) shotB64 = toBase64(img.bytes);
        const up = await admin.storage.from("brand-assets").upload(`${partnerId}/screenshot.png`, img.bytes, { contentType: img.contentType, upsert: true });
        if (!up.error) screenshotUrl = admin.storage.from("brand-assets").getPublicUrl(`${partnerId}/screenshot.png`).data.publicUrl;
      }
    }

    // Brand kit — vision-refined from the screenshot, else Firecrawl branding.
    let vColors: Record<string, string> | null = null;
    let vFonts: { display: string; body: string } | null = null;
    if (shotB64 && geminiKey) {
      const o = await geminiJson(geminiKey,
        `This is a full-page screenshot of a car-rental website. Return ONLY JSON {"colors":{"primary":"#hex","accent":"#hex","bg":"#hex","text":"#hex"},"fonts":{"display":"Family","body":"Family"}}. primary=dominant brand/accent colour; bg=MAIN page background (header/hero, ignore light sub-sections); text=main text colour; fonts=heading and body families if identifiable else "". 6-digit hex.`,
        { mime: shotMime, b64: shotB64 });
      if (o && o.colors) {
        const isHex = (v: any) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim());
        const c: Record<string, string> = {};
        for (const k of ["primary", "accent", "bg", "text"]) if (isHex(o.colors[k])) c[k] = o.colors[k].trim();
        if (Object.keys(c).length) vColors = c;
        vFonts = { display: String(o.fonts?.display || ""), body: String(o.fonts?.body || "") };
      }
    }
    const fcColors = branding.colors || branding.colours || branding.palette || {};
    const fcFonts = branding.fonts || branding.typography || [];
    const fontByRole = (re: RegExp) => (Array.isArray(fcFonts) ? (fcFonts.find((f: any) => re.test(f.role || "")) || {}).family : null);
    const display = (vFonts && vFonts.display) || fontByRole(/head|display|title/i) || (Array.isArray(fcFonts) ? (fcFonts[0] || {}).family : fcFonts.display) || "";
    const bodyFont = (vFonts && vFonts.body) || fontByRole(/body|text|para/i) || (Array.isArray(fcFonts) ? (fcFonts[1] || {}).family : fcFonts.body) || display;
    const brandKitRaw: any = {
      source: vColors ? "vision" : "firecrawl",
      colors: vColors || { primary: fcColors.primary, accent: fcColors.accent || fcColors.link, bg: fcColors.background || fcColors.bg, text: fcColors.textPrimary || fcColors.text },
      fonts: { display, body: bodyFont, url: googleFontsUrl([display, bodyFont]) },
      logo_url: branding.logo || branding.logoUrl || branding.logo_url || null,
    };
    if (brandKitRaw.logo_url) {
      const stored = await persistAsset(admin, "brand-assets", `${partnerId}/logo`, brandKitRaw.logo_url);
      if (stored) brandKitRaw.logo_url = stored;
    }

    // Pages / USP copy.
    const copy = d.json || {};
    const partnerPages = {
      usp: copy.usp || null, about: copy.about || null,
      benefits: Array.isArray(copy.benefits) ? copy.benefits : [],
      services: Array.isArray(copy.services) ? copy.services : [],
      contact: copy.contact || {},
      pages: [{ title: "Home", url, copy: (d.markdown || "").slice(0, 8000) }],
    };

    const generator = d.metadata?.generator || "";
    const techStack = detectTechStack(d.rawHtml || d.html || "", [...(d.links || []), ...mapLinks], generator);

    // Homepage car images.
    const homepageImages = (Array.isArray(d.images) ? d.images : [])
      .map((x: any) => (typeof x === "string" ? x : x.url || x.src)).filter(isLikelyPhoto);
    const seen = new Set<string>();
    const images = homepageImages.filter((u: string) => (seen.has(u) ? false : (seen.add(u), true)))
      .slice(0, MAX_HOMEPAGE_IMAGES).map((u: string) => ({ url: u, source: "homepage" }));

    await admin.from("partners").update({ brand_kit_raw: brandKitRaw, partner_pages: partnerPages, tech_stack: techStack }).eq("id", partnerId);

    // 2b) Structured car list — Gemini over the homepage (+ fleet) markdown.
    let fleetMd = "";
    if (fleetUrl) {
      try {
        const fr = await fetch(`${FC}/v2/scrape`, { method: "POST", headers: fcHeaders, body: JSON.stringify({ url: fleetUrl, formats: ["markdown"] }) });
        if (fr.ok) { const fj = await fr.json(); fleetMd = (fj.data || fj).markdown || ""; }
      } catch { /* best-effort */ }
    }
    let cars: any[] = [];
    if (geminiKey) {
      const md = [(d.markdown || ""), fleetMd].filter(Boolean).join("\n\n---\n\n").slice(0, 16000);
      const o = await geminiJson(geminiKey,
        `From this car-rental website content, list EVERY rental car. Return ONLY JSON {"cars":[{"make":"","model":"","year":"","price_per_day":"","power":"","seats":"","transmission":"","fuel":""}]}. price_per_day = daily price as a plain number (CHF, no symbol); use "" when unknown. Do not invent cars.\n\nCONTENT:\n${md}`);
      if (o && Array.isArray(o.cars)) cars = o.cars.slice(0, 40);
    }

    // 3) Kick off the async fleet crawl (augments images via the poll).
    let crawlId: string | null = null;
    if (fleetUrl) {
      try {
        const crawlRes = await fetch(`${FC}/v2/crawl`, {
          method: "POST", headers: fcHeaders,
          body: JSON.stringify({ url: fleetUrl, limit: 30, maxDiscoveryDepth: 2, includePaths: [FLEET_RE.source], scrapeOptions: { formats: ["images", "markdown"] } }),
        });
        if (crawlRes.ok) { const cj = await crawlRes.json(); crawlId = cj.id || cj.data?.id || null; }
      } catch { /* optional */ }
    }

    const { data: updated } = await admin.from("partner_ingest_jobs").update({
      status: "ready", firecrawl_crawl_id: crawlId, fleet_url: fleetUrl,
      screenshot_url: screenshotUrl, images, cars, crawl_done: !crawlId,
    }).eq("id", jobId).select().single();

    return json({ job: updated });
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    if (jobId && admin) await admin.from("partner_ingest_jobs").update({ status: "failed", error: msg }).eq("id", jobId).catch(() => {});
    return json({ error: msg }, 500);
  }
});
