// AIRLUXO — licence-session
// Desktop↔mobile hand-off for the licence scan. The desktop creates a session
// and polls it; the phone (after extracting fields) submits the result. Gated by
// the service role here, so the licence_sessions table needs no anon RLS access.
// verify_jwt OFF.
//
// Body: { action: "create" } -> { id }
//       { action: "get", id } -> { status, result }
//       { action: "submit", id, result } -> { ok: true }

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
  try {
    const { action, id, result } = await req.json();
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "create") {
      const { data, error } = await db.from("licence_sessions").insert({}).select("id").single();
      if (error) throw error;
      return json({ id: data.id });
    }
    if (action === "get") {
      if (!id) return json({ error: "id required" }, 400);
      const { data } = await db.from("licence_sessions").select("status, result").eq("id", id).maybeSingle();
      if (!data) return json({ error: "not found" }, 404);
      return json({ status: data.status, result: data.result });
    }
    if (action === "submit") {
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await db.from("licence_sessions").update({ status: "done", result: result || null }).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
