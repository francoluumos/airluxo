// AIRLUXO — translate
// AI-translates UI strings for the founder Translation section. Admin-gated.
// Body: { locale: 'de'|'fr'|'it', items: [{ key, text }] }
// Returns: { translations: { [key]: translatedText } }
// Secret: GEMINI_API_KEY (+ optional GEMINI_TEXT_MODEL). The client writes the
// results to public.translations (RLS admin-only); this only does the translating.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const LANGS: Record<string, string> = { de: "German", fr: "French", it: "Italian", en: "English" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Admin gate.
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: adm } = await admin.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!adm) return json({ error: "Not authorized" }, 403);

  let body: { locale?: string; items?: Array<{ key: string; text: string }> } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const lang = LANGS[String(body.locale || "")];
  const items = (body.items || []).filter((x) => x && x.key && x.text);
  if (!lang) return json({ error: "Unsupported locale" }, 400);
  if (!items.length) return json({ translations: {} });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured" }, 500);
  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash";

  const dict: Record<string, string> = {};
  items.forEach((x) => { dict[x.key] = x.text; });

  const prompt = `You are translating UI strings for AIRLUXO, a Swiss luxury car-rental marketplace. Translate each value from English into ${lang}.
Rules:
- Keep the luxury, understated brand tone.
- Keep any {placeholder} tokens EXACTLY as-is (do not translate or reorder their names).
- Never translate the brand name "AIRLUXO".
- Keep it concise — these are buttons, labels and short UI strings.
- Return ONLY a JSON object mapping each key to its ${lang} translation. Same keys, no extras.

Input (JSON, key → English):
${JSON.stringify(dict)}`;

  let resp: Response;
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
      },
    );
  } catch (e) {
    return json({ error: `Network error calling Gemini: ${String((e as Error)?.message || e)}` }, 502);
  }
  if (!resp.ok) return json({ error: `Gemini error ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502);

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  let translations: Record<string, string>;
  try { translations = JSON.parse(text); } catch { return json({ error: "Could not parse the translation." }, 422); }

  // Only return keys we asked for, as strings.
  const clean: Record<string, string> = {};
  for (const k of Object.keys(dict)) if (typeof translations[k] === "string") clean[k] = translations[k];
  return json({ translations: clean });
});
