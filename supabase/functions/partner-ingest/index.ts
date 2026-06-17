// AIRLUXO — partner-ingest
// From a prospect's website URL, extract a brand kit (colours/fonts/logo), USP + page
// copy, a tech-stack read (CMS / payments / booking tool), a full-page screenshot, and
// the car images — via Firecrawl (v2). The homepage is scraped synchronously; the fleet
// path is crawled asynchronously and finalized by partner-ingest-poll. Assets are
// persisted to Storage immediately (Firecrawl URLs expire in 24h). Admin-only; the
// impeccable + Drive agent pass (U5) refines the result before the founder applies it.
//
// verify_jwt OFF — auth checked here (admin JWT OR service-role key).
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY.
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

// Skip logos/icons/sprites/tiny assets when collecting car images. Also drops Wix
// lazy-load placeholders (blur_*) and small thumbnails (w_<400) that are not real photos.
function isLikelyPhoto(u: string): boolean {
  if (!u || u.startsWith("data:")) return false;
  if (/\.svg(\?|$)/i.test(u)) return false;
  if (/(sprite|icon|logo|favicon|placeholder|avatar|badge|flag|pixel|spacer)/i.test(u)) return false;
  if (/blur_\d/i.test(u)) return false;                 // Wix lazy-load placeholder
  const w = u.match(/[/_,]w_(\d{2,4})/i);                // Wix width param → drop small thumbs
  if (w && Number(w[1]) < 400) return false;
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) || /(format=|fit=|w=\d|width=)/i.test(u);
}

// AI-extraction schema for the fleet page → a structured car list.
const CARS_SCHEMA = {
  type: "object",
  properties: {
    cars: {
      type: "array",
      items: {
        type: "object",
        properties: {
          make: { type: "string" }, model: { type: "string" }, year: { type: "string" },
          price_per_day: { type: "string", description: "Daily rental price as a number, CHF" },
          power: { type: "string", description: "Horsepower" }, seats: { type: "string" },
          transmission: { type: "string" }, fuel: { type: "string" },
          image_url: { type: "string", description: "Main photo URL of the car" },
        },
      },
    },
  },
};

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
  else if (/\b(book(ing)?|reserv|miete|noleggi|réserv)\b/i.test(allLinks)) booking = "Custom booking flow";

  const analytics: string[] = [];
  if (has("googletagmanager") || has("google-analytics") || has("gtag")) analytics.push("Google Analytics");
  if (has("hotjar")) analytics.push("Hotjar");
  if (has("facebook.com/tr") || has("connect.facebook.net")) analytics.push("Meta Pixel");

  const ecommerce = has("woocommerce") ? "WooCommerce" : (cms === "Shopify" ? "Shopify" : null);

  return {
    cms, booking, payments, analytics, ecommerce,
    detected_at: new Date().toISOString(),
  };
}

async function persistAsset(admin: any, bucket: string, path: string, srcUrl: string): Promise<string | null> {
  const img = await fetchImageSafe(srcUrl); // SSRF-guarded: https, public host, image/*, size-capped
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

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "").trim();
    const url = normUrl(body.url);
    if (!partnerId) return json({ error: "partner_id required" }, 400);
    if (!url) return json({ error: "a valid url is required" }, 400);

    admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const fcHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${fcKey}` };

    // Open the job.
    const { data: job, error: jErr } = await admin.from("partner_ingest_jobs")
      .insert({ partner_id: partnerId, url, status: "scraping" }).select().single();
    if (jErr) return json({ error: jErr.message }, 500);
    jobId = job.id;

    // 1) Map the site → URL inventory; pick the homepage + a fleet path.
    let fleetUrl: string | null = null;
    let mapLinks: string[] = [];
    try {
      const mapRes = await fetch(`${FC}/v2/map`, { method: "POST", headers: fcHeaders, body: JSON.stringify({ url, limit: 200 }) });
      if (mapRes.ok) {
        const mj = await mapRes.json();
        mapLinks = (mj.links || mj.data?.links || []).map((l: any) => (typeof l === "string" ? l : l.url)).filter(Boolean);
        fleetUrl = mapLinks.find((l) => FLEET_RE.test(l)) || null;
      }
    } catch { /* map is best-effort */ }

    // 2) Scrape the homepage synchronously — branding + USP/copy json + screenshot + images.
    const uspSchema = {
      type: "object",
      properties: {
        usp: { type: "string", description: "The single strongest value proposition / tagline" },
        about: { type: "string", description: "Short company/about paragraph" },
        benefits: { type: "array", items: { type: "string" }, description: "Key selling points / benefits" },
        services: { type: "array", items: { type: "string" } },
        contact: {
          type: "object",
          properties: { email: { type: "string" }, phone: { type: "string" }, address: { type: "string" } },
        },
      },
    };
    const scrapeRes = await fetch(`${FC}/v2/scrape`, {
      method: "POST", headers: fcHeaders,
      body: JSON.stringify({
        url,
        formats: [
          "markdown", "links", "rawHtml", "branding", "images",
          { type: "screenshot", fullPage: true },
          { type: "json", schema: uspSchema, prompt: "Extract the company's USP, about text, key benefits, services and contact details." },
        ],
      }),
    });
    if (!scrapeRes.ok) {
      const msg = `Firecrawl scrape ${scrapeRes.status}: ${(await scrapeRes.text()).slice(0, 200)}`;
      await admin.from("partner_ingest_jobs").update({ status: "failed", error: msg }).eq("id", jobId);
      return json({ error: msg }, 502);
    }
    const sj = await scrapeRes.json();
    const d = sj.data || sj;

    // Brand kit (raw, from Firecrawl branding) — refined later by the impeccable agent.
    const branding = d.branding || {};
    const brandKitRaw = {
      source: "firecrawl",
      colors: branding.colors || branding.colours || branding.palette || {},
      fonts: branding.fonts || branding.typography || {},
      logo_url: branding.logo || branding.logoUrl || branding.logo_url || null,
      raw: branding,
    };

    // Pages / USP copy.
    const copy = d.json || {};
    const partnerPages = {
      usp: copy.usp || null,
      about: copy.about || null,
      benefits: Array.isArray(copy.benefits) ? copy.benefits : [],
      services: Array.isArray(copy.services) ? copy.services : [],
      contact: copy.contact || {},
      pages: [{ title: "Home", url, copy: (d.markdown || "").slice(0, 8000) }],
    };

    // Tech stack.
    const generator = d.metadata?.generator || d.metadata?.["generator"] || "";
    const techStack = detectTechStack(d.rawHtml || d.html || "", [...(d.links || []), ...mapLinks], generator);

    // Persist the screenshot (24h expiry → store now).
    let screenshotUrl: string | null = null;
    const shotSrc = d.screenshot || d.screenshotUrl || (Array.isArray(d.actions?.screenshots) ? d.actions.screenshots[0] : null);
    if (shotSrc) screenshotUrl = await persistAsset(admin, "brand-assets", `${partnerId}/screenshot.png`, shotSrc);

    // Persist the logo if branding gave one.
    if (brandKitRaw.logo_url) {
      const stored = await persistAsset(admin, "brand-assets", `${partnerId}/logo`, brandKitRaw.logo_url);
      if (stored) brandKitRaw.logo_url = stored;
    }

    // Homepage car images (best-effort; the fleet crawl finds the rest).
    const homepageImages = (Array.isArray(d.images) ? d.images : [])
      .map((x: any) => (typeof x === "string" ? x : x.url || x.src)).filter(isLikelyPhoto);
    const seen = new Set<string>();
    const images = homepageImages.filter((u: string) => (seen.has(u) ? false : (seen.add(u), true)))
      .slice(0, MAX_HOMEPAGE_IMAGES).map((u: string) => ({ url: u, source: "homepage" }));

    // Write the proposal onto the partner (raw — applied later in review/apply, U6).
    await admin.from("partners").update({
      brand_kit_raw: brandKitRaw, partner_pages: partnerPages, tech_stack: techStack,
    }).eq("id", partnerId);

    // 2b) Structured car extraction over the fleet page (AI json) → a real car list.
    let cars: any[] = [];
    if (fleetUrl) {
      try {
        const carRes = await fetch(`${FC}/v2/scrape`, {
          method: "POST", headers: fcHeaders,
          body: JSON.stringify({
            url: fleetUrl,
            formats: [{ type: "json", schema: CARS_SCHEMA, prompt: "Extract every rental car offered on this page. For each car return make, model, year, price per day (number, CHF), power (hp), seats, transmission, fuel, and the main image URL." }],
          }),
        });
        if (carRes.ok) {
          const cj = await carRes.json();
          const cd = cj.data || cj;
          cars = Array.isArray(cd.json?.cars) ? cd.json.cars.slice(0, 40) : [];
        }
      } catch { /* extraction is best-effort */ }
    }

    // 3) Kick off the async fleet crawl (finalized by partner-ingest-poll).
    let crawlId: string | null = null;
    if (fleetUrl) {
      try {
        const crawlRes = await fetch(`${FC}/v2/crawl`, {
          method: "POST", headers: fcHeaders,
          body: JSON.stringify({
            url: fleetUrl, limit: 30, maxDiscoveryDepth: 2,
            includePaths: [FLEET_RE.source],
            scrapeOptions: { formats: ["images", "markdown"] },
          }),
        });
        if (crawlRes.ok) { const cj = await crawlRes.json(); crawlId = cj.id || cj.data?.id || null; }
      } catch { /* crawl is optional */ }
    }

    // Ready immediately — the homepage scrape + car extraction are the reviewable data.
    // The fleet crawl only augments images later (poll); crawl_done=false means "pending".
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
