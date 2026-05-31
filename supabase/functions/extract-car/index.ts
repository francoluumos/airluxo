// AIRLUXO — extract-car
// Identifies the car in an uploaded photo via Gemini and returns make / model /
// exterior colour / category to prefill the "List a car" form. verify_jwt OFF.
//
// Secret: GEMINI_API_KEY (+ optional GEMINI_TEXT_MODEL, default gemini-2.5-flash)

const PROMPT =
  "Identify the car in this photo. Return ONLY a JSON object with keys: " +
  "make (manufacturer, e.g. Porsche), model (e.g. 911 Carrera 4 GTS), " +
  "exterior_color (human colour name, e.g. Guards Red, Black, GT Silver), " +
  "category (exactly one of: Sport, Exotic, GT, SUV). " +
  "Use null for anything you are not confident about. Output only the JSON object.";

const CATS = ["Sport", "Exotic", "GT", "SUV"];

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
  if (!resp.ok) return json({ error: `Gemini error ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502);

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  let f;
  try { f = JSON.parse(text); } catch { return json({ error: "Could not identify the car." }, 422); }

  return json({
    make: f.make ?? null,
    model: f.model ?? null,
    exterior_color: f.exterior_color ?? null,
    category: CATS.includes(f.category) ? f.category : null,
  });
});
