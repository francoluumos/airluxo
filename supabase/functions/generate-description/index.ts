// AIRLUXO — generate-description
// Writes a short, evocative car description for a listing (shown on the booking
// detail popup). Called from the partner "list a car" form. verify_jwt ON — only
// authenticated partners. Secret: GEMINI_API_KEY (+ optional GEMINI_TEXT_MODEL).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured" }, 500);
  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash";

  let c: Record<string, unknown> = {};
  try { c = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const facts = [
    c.make && c.model ? `${c.make} ${c.model}` : null,
    c.year ? `year ${c.year}` : null,
    c.category ? `${c.category} class` : null,
    c.power ? `${c.power} hp` : null,
    c.accel ? `0–100 in ${c.accel}s` : null,
    c.gearbox || null,
    c.fuel || null,
    c.exterior_color ? `${c.exterior_color} exterior` : null,
    c.interior_color ? `${c.interior_color} interior` : null,
    c.location ? `available in ${c.location}` : null,
  ].filter(Boolean).join(", ");

  if (!facts) return json({ error: "Need at least the make and model." }, 400);

  const prompt = `You write copy for AIRLUXO, a Swiss luxury car-rental marketplace. Write a description for this car that SELLS the experience of driving it: luxurious, epic, emotional, cinematic. Speak to the feeling and the occasion, not just the specs. Second person ("you"). 2–3 sentences, 45–75 words. No markdown, no emojis, no quotation marks, no hashtags, no price, no em dashes. Return ONLY the description text.

Car: ${facts}.`;

  let resp: Response;
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 250 },
        }),
      },
    );
  } catch (e) {
    return json({ error: `Network error calling Gemini: ${String((e as Error)?.message || e)}` }, 502);
  }
  if (!resp.ok) return json({ error: `Gemini error ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502);

  const data = await resp.json();
  const text = (data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "")
    .trim().replace(/^["']|["']$/g, "").trim();
  if (!text) return json({ error: "Could not generate a description." }, 422);

  return json({ description: text });
});
