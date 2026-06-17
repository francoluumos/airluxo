// AIRLUXO — partner-ingest-poll
// Finalizes the async fleet crawl started by partner-ingest. Runs on a 2-min cron
// (service-role bearer). For each job in 'crawling', it checks Firecrawl; when the
// crawl is complete it downloads the car images into Storage (24h Firecrawl expiry),
// records them on the job, and flips the job to 'ready' for the agent/review steps.
//
// verify_jwt OFF — auth = the service-role key (cron) or an admin user.
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY.

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
const MAX_IMAGES_PER_JOB = 60;
const CRAWL_TIMEOUT_MIN = 30;

function isLikelyPhoto(u: string): boolean {
  if (!u || u.startsWith("data:")) return false;
  if (/\.svg(\?|$)/i.test(u)) return false;
  if (/(sprite|icon|logo|favicon|placeholder|avatar|badge|flag|pixel|spacer)/i.test(u)) return false;
  if (/blur_\d/i.test(u)) return false;
  const w = u.match(/[/_,]w_(\d{2,4})/i);
  if (w && Number(w[1]) < 400) return false;
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) || /(format=|fit=|w=\d|width=)/i.test(u);
}

async function persist(admin: any, path: string, srcUrl: string): Promise<string | null> {
  const img = await fetchImageSafe(srcUrl); // SSRF-guarded: https, public host, image/*, size-capped
  if (!img) return null;
  const { error } = await admin.storage.from("listing-photos").upload(path, img.bytes, { contentType: img.contentType, upsert: true });
  if (error) return null;
  return admin.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
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

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data: jobs } = await admin.from("partner_ingest_jobs")
      .select("*").eq("status", "crawling").not("firecrawl_crawl_id", "is", null).limit(10);

    const fcHeaders = { Authorization: `Bearer ${fcKey}` };
    let finalized = 0;
    for (const job of jobs || []) {
      // Give up on a crawl that never completes (don't poll forever).
      const ageMin = (Date.now() - new Date(job.created_at).getTime()) / 60000;
      try {
        const res = await fetch(`${FC}/v2/crawl/${job.firecrawl_crawl_id}`, { headers: fcHeaders });
        if (!res.ok) {
          if (ageMin > CRAWL_TIMEOUT_MIN) await admin.from("partner_ingest_jobs").update({ status: "ready", error: `crawl poll ${res.status}` }).eq("id", job.id);
          continue;
        }
        const cj = await res.json();
        const st = cj.status || cj.data?.status;
        if (st !== "completed") {
          if (ageMin > CRAWL_TIMEOUT_MIN) await admin.from("partner_ingest_jobs").update({ status: "ready", error: "crawl timed out" }).eq("id", job.id);
          continue;
        }

        // Gather image URLs across all crawled pages.
        const pages = cj.data || cj.pages || [];
        const found = new Set<string>();
        for (const p of pages) {
          const imgs = (Array.isArray(p.images) ? p.images : []).map((x: any) => (typeof x === "string" ? x : x.url || x.src));
          for (const u of imgs) if (isLikelyPhoto(u)) found.add(u);
        }

        // Download into Storage (Firecrawl URLs expire in 24h).
        const existing = Array.isArray(job.images) ? job.images : [];
        const stored: any[] = [...existing];
        let i = 0;
        for (const src of Array.from(found).slice(0, MAX_IMAGES_PER_JOB)) {
          const pub = await persist(admin, `ingest/${job.partner_id}/${job.id}/${i}.jpg`, src);
          if (pub) stored.push({ url: pub, source: "crawl" });
          i++;
        }

        await admin.from("partner_ingest_jobs").update({ status: "ready", images: stored }).eq("id", job.id);
        finalized++;
      } catch (e) {
        if (ageMin > CRAWL_TIMEOUT_MIN) await admin.from("partner_ingest_jobs").update({ status: "failed", error: String((e as Error)?.message || e) }).eq("id", job.id);
      }
    }

    return json({ ok: true, checked: (jobs || []).length, finalized });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
