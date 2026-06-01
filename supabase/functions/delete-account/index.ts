// AIRLUXO — delete-account (GDPR "delete my account & data")
// Authenticated customer deletes their own account. We identify the caller from
// their JWT, then use the service role to delete the auth user — which cascades
// to `customers` and `favourites` (ON DELETE CASCADE) and detaches their
// `bookings` (user_id ON DELETE SET NULL, keeping the record for the partner).
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (both preset by Supabase).
// Deploy with verify_jwt — only signed-in users can call it.

import { createClient } from "jsr:@supabase/supabase-js@2";

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

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Identify the caller from their JWT.
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return json({ error: "Not authenticated" }, 401);

  // Delete the auth user → cascades customers/favourites, nulls bookings.user_id.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ deleted: true });
});
