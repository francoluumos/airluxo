// AIRLUXO — verify-licence
// Extracts fields from a driver's-licence photo via Gemini and returns them as
// JSON for the guest to review. The image is NOT stored (privacy); only the
// guest-confirmed fields are later saved on the booking. verify_jwt OFF (guest).
//
// Secret: GEMINI_API_KEY (+ optional GEMINI_TEXT_MODEL, default gemini-2.5-flash)

const PROMPT =
  "You are reading a photo of a driver's licence. Return ONLY a JSON object with these keys: " +
  "first_name, last_name, birth_date (ISO YYYY-MM-DD), valid_from (ISO YYYY-MM-DD; the first day of validity / issue date), " +
  "categories (array of permit category codes such as B, A1, BE), number (the licence or document number). " +
  "Use null for any field that is not clearly readable. Output only the JSON object, no extra text.";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured" }, 500);
  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash";

  let payload: { image?: string; mimeType?: string };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const { image, mimeType } = payload;
  if (!image) return json({ error: "No image provided" }, 400);

  let resp: Response;
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      },
    );
  } catch (e) {
    return json({ error: `Network error calling Gemini: ${String((e as Error)?.message || e)}` }, 502);
  }
  if (!resp.ok) {
    return json({ error: `Gemini error ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  let fields;
  try { fields = JSON.parse(text); } catch { return json({ error: "Could not read the licence — try a clearer photo." }, 422); }

  return json({
    first_name: fields.first_name ?? null,
    last_name: fields.last_name ?? null,
    birth_date: fields.birth_date ?? null,
    valid_from: fields.valid_from ?? null,
    categories: Array.isArray(fields.categories) ? fields.categories : (fields.categories ? [fields.categories] : []),
    number: fields.number ?? null,
  });
});
