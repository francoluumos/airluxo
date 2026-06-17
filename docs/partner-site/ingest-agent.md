# Partner-ingest agent pass (U5)

The agent half of the partner ingest. After `partner-ingest` (Firecrawl) leaves a
**proposal** on a prospect (`brand_kit_raw`, `partner_pages`, `tech_stack`, job
`images` + `screenshot_url`), a Claude agent **refines** it with vision/impeccable and
**exports** the car images to Google Drive, then writes the result back via the
`partner-ingest-update` contract. The founder still reviews + applies in the admin
(Brand & pitch → Review & apply) — this pass just makes the proposal clean.

## Why an agent (not the edge fn)
The impeccable skill and the Google Drive MCP are agent-side only (no Deno runtime), so
this is the backend-ingest → agent-enrich split we use elsewhere (mirrors the content
pipeline's `generation-agent`).

## Inputs
Load the job + proposal with `admin_partner_brand_review(p_partner_id)` (admin JWT) or
read `partners`/`partner_ingest_jobs` directly with the service role. You need:
- `screenshot_url` — the stored full-page screenshot (in the `brand-assets` bucket)
- `brand_kit_raw` — Firecrawl's first-pass colours/fonts/logo
- `job.images` — the scraped car images (already in Storage)
- `company_name`, `partner_pages`

## Steps
1. **Audit the brand kit (vision / impeccable).** Open `screenshot_url` and read the
   *real* brand identity from the rendered page, correcting Firecrawl's common misses:
   - drop browser-default values it grabs as "primary" (e.g. the unstyled link-blue
     `#0000EE`) — pick the actual dominant brand colour from the design
   - confirm the accent, background and text colours against the screenshot
   - confirm the heading + body font families
   - **recover the logo** if `branding` missed it (common on Wix/Squarespace, which serve
     logos as background images/SVGs) — find the logo URL from the homepage and use it
   - write a one-line `design_notes` read (tone: e.g. "bold, high-contrast, yellow accent")
2. **Export car images to Drive (Google Drive MCP).** Create a folder
   `AIRLUXO Partners / <company_name>` under the luumos.io Drive root and upload the
   `job.images` (download each from Storage, upload bytes). Keep the folder's shareable
   URL for `drive_folder_url`.
3. **Write back.** POST to `partner-ingest-update` (service-role bearer):
   ```json
   {
     "partner_id": "<uuid>",
     "brand_kit": { "colors": {"primary":"#…","accent":"#…","bg":"#…","text":"#…"},
                    "fonts": {"display":"…","body":"…","url":"https://fonts.googleapis.com/…"},
                    "logo_url": "https://…" },
     "partner_pages": { "usp": "…", "about": "…", "benefits": ["…"], "contact": {…} },
     "drive_folder_url": "https://drive.google.com/…",
     "design_notes": "bold, high-contrast, yellow accent"
   }
   ```
   This stores the refined kit into `brand_kit_raw` (the proposal), sets `drive_folder_url`,
   and flips the job to `ready`. The founder opens Review & apply, tweaks if needed, and
   Applies — which sets the live `brand_kit` and themes the storefront/site.

## Contract
- `supabase/functions/partner-ingest-update/index.ts` — service-role or admin; merges only
  the keys you send; never goes live on its own (proposal only).

## Notes
- Fonts must resolve to an allowlisted host (`fonts.googleapis.com`, `fonts.gstatic.com`,
  `api.fontshare.com`, `use.typekit.net`) or the storefront drops them (see
  `src/lib/brandkit.js` `loadBrandFont`). Prefer a Google Fonts `css2` URL.
- Colours are validated client-side (`brandKitToVars`); send plain hex/rgb/hsl.
- If the screenshot is missing, fall back to the Firecrawl kit (don't fail the pass).
