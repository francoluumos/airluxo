// AIRLUXO — studio-shot
// Regenerates an uploaded car photo as a clean 3/4 studio shot using
// Google Gemini 2.5 Flash Image ("Nano Banana"). Returns the generated image
// as base64; the client uploads it to storage.
//
// Secrets required (set in Supabase → Edge Functions → Manage secrets):
//   GEMINI_API_KEY        — your Google AI Studio key (required)
//   GEMINI_IMAGE_MODEL    — optional override, defaults to gemini-2.5-flash-image
//
// verify_jwt is ON: only authenticated partners can call this.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROMPT =
  "Re-render the car from the input image as a clean studio product shot. It must stay the EXACT same vehicle: identical make, model, body style, paint colour, wheels, badges and trim. " +
  "Apply these composition rules identically every time so all outputs match: " +
  "1) Orientation: a front three-quarter view with the car facing LEFT — the front of the car points toward the left edge. If the input faces the other way, mirror it so the car always faces left. " +
  "2) Camera: low eye-level, about 15 degrees above the ground, roughly a 50mm lens, the car perfectly level and not tilted. " +
  "3) Framing: the whole car centred and fully in frame, occupying about 85% of the image width, with even margins and nothing cropped. " +
  "4) Background: a flat, seamless, pure white #FFFFFF background — absolutely no floor, no horizon line, no gradient, no reflections, no scenery and no props. Add only a soft, subtle contact shadow directly beneath the tyres. " +
  "5) Style: photorealistic automotive-catalogue look, sharp focus, even neutral studio lighting. " +
  "Do not add any text, watermark, licence-plate text, people or other vehicles. Output a wide 16:9 landscape image.";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured" }, 500);

  const model = Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image";

  let payload: { image?: string; mimeType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
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
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType || "image/jpeg", data: image } },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );
  } catch (e) {
    return json({ error: `Network error calling Gemini: ${String((e as Error)?.message || e)}` }, 502);
  }

  if (!resp.ok) {
    const text = await resp.text();
    return json({ error: `Gemini error ${resp.status}: ${text.slice(0, 400)}` }, 502);
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p: Record<string, unknown>) => p.inline_data || p.inlineData);
  const inline = (imgPart?.inline_data || imgPart?.inlineData) as
    | { data?: string; mime_type?: string; mimeType?: string }
    | undefined;

  if (!inline?.data) {
    return json({ error: "Gemini returned no image (check model name / quota)" }, 502);
  }

  return json({ image: inline.data, mimeType: inline.mime_type || inline.mimeType || "image/png" });
});
