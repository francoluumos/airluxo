// AIRLUXO — enrich-prospect
// Reads a prospect's website with Gemini (url_context tool) + web search grounding
// and returns structured company details to pre-fill the lead form. Admin-only,
// verify_jwt ON. Nothing is written here — the founder reviews and saves.
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
//          (+ optional GEMINI_TEXT_MODEL, default gemini-2.5-flash).
// Body: { url }  →  { data: { company_name, street, street_number, zip, city, country,
//          email, phone, vat_number, links:[{platform,url}] } }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Pull the first {...} JSON object out of Gemini's text (it may wrap it in prose / fences).
function parseJson(text: string): Record<string, unknown> | null {
  const fenced = text.replace(/```json|```/gi, "");
  const m = fenced.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function normUrl(raw: string): string | null {
  let u = String(raw || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).toString(); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authz = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authz } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: adm } = await admin.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adm) return json({ error: "Not authorized" }, 403);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured" }, 500);
    const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash";

    const body = await req.json().catch(() => ({}));
    const url = normUrl(body.url);
    if (!url) return json({ error: "A valid website URL is required" }, 400);

    const prompt = `You are enriching a CRM lead for AIRLUXO (a Swiss luxury car-rental marketplace). Read this company's website: ${url}
Use the page content, its imprint/contact/legal pages, and web search if needed, to find the company's official details. Swiss VAT/UID looks like "CHE-123.456.789" (often shown with "MWST"/"TVA").

Return ONLY a JSON object (no prose, no markdown) with these keys; use null when unknown:
{
  "company_name": string|null,
  "street": string|null,          // street name only, no number
  "street_number": string|null,
  "zip": string|null,             // postal code
  "city": string|null,
  "country": string|null,         // e.g. "Switzerland"
  "email": string|null,           // main contact email
  "phone": string|null,           // main phone, international format if possible
  "vat_number": string|null,      // e.g. "CHE-123.456.789"
  "socials": { "instagram": string|null, "linkedin": string|null, "facebook": string|null, "tiktok": string|null, "youtube": string|null, "x": string|null }
}`;

    let resp: Response;
    try {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ url_context: {} }, { google_search: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
          }),
        },
      );
    } catch (e) {
      return json({ error: `Network error calling Gemini: ${String((e as Error)?.message || e)}` }, 502);
    }
    if (!resp.ok) return json({ error: `Gemini error ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502);

    const gem = await resp.json();
    const text = (gem?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "").trim();
    const parsed = parseJson(text);
    if (!parsed) return json({ error: "Could not read structured details from that site." }, 422);

    const str = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s && s.toLowerCase() !== "null" ? s : "";
    };
    const PLATFORMS: Record<string, string> = {
      instagram: "Instagram", linkedin: "LinkedIn", facebook: "Facebook",
      tiktok: "TikTok", youtube: "YouTube", x: "X",
    };
    const socials = (parsed.socials || {}) as Record<string, unknown>;
    const links = Object.entries(PLATFORMS)
      .map(([k, label]) => ({ platform: label, url: str(socials[k]) }))
      .filter((l) => l.url);

    return json({
      data: {
        company_name: str(parsed.company_name),
        street: str(parsed.street),
        street_number: str(parsed.street_number),
        zip: str(parsed.zip),
        city: str(parsed.city),
        country: str(parsed.country),
        email: str(parsed.email),
        phone: str(parsed.phone),
        vat_number: str(parsed.vat_number),
        links,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
