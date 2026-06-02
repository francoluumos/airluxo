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
  "3) Framing: the whole car centred horizontally and vertically, fully in frame, occupying about 85% of the image width, with even margins; nothing cropped and nothing touching the edges. " +
  "4) Background: replace the ENTIRE scene with a flat, seamless, fully opaque pure white #FFFFFF that fills the whole canvas edge to edge — no transparency, no ragged or torn edges, no leftover scenery, no floor line, no horizon, no gradient, no vignette, no reflections and no props. Add only one soft, subtle contact shadow directly beneath the tyres. " +
  "5) Style: photorealistic automotive-catalogue look, sharp focus, even neutral studio lighting. " +
  "Avoid: harsh shadows, uneven lighting, building or window reflections, street or floor textures, a floating car, cropped edges, distorted proportions, grey or off-white background, transparent areas. " +
  "Do not add any text, watermark, licence-plate text, people or other vehicles.";

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
          // Lock the output geometry so every car comes out identically framed:
          // imageConfig.aspectRatio forces 16:9 (otherwise Nano Banana inherits the
          // input photo's ratio — the main source of inconsistent sizing/edges); a
          // low temperature reduces run-to-run variance.
          generationConfig: {
            responseModalities: ["IMAGE"],
            temperature: 0.2,
            imageConfig: { aspectRatio: "16:9" },
          },
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
