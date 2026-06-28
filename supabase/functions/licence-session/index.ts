// AIRLUXO — licence-session
// Desktop↔mobile hand-off for the licence scan. The desktop creates a session
// and polls it; the phone (after extracting fields) submits the result. Gated by
// the service role here, so the licence_sessions table needs no anon RLS access.
// verify_jwt OFF.
//
// The session id alone is NOT a credential. Possession of an unguessable token is
// required for every read/write, so knowing/guessing an id leaks nothing:
//   * read_token   — returned only to the desktop creator; required on `get`.
//   * submit_token — carried in the QR to the phone; required on `submit`.
// Sessions expire after TTL_MINUTES, and the result is purged once the desktop reads it.
//
// Body: { action: "create" } -> { id, read_token, submit_token }
//       { action: "get", id, read_token } -> { status, result }
//       { action: "submit", id, submit_token, result } -> { ok: true }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TTL_MINUTES = 20;
// Constant-time string compare so token checks don't leak via timing.
function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
const isFresh = (createdAt: string | null) =>
  !!createdAt && (Date.now() - new Date(createdAt).getTime()) < TTL_MINUTES * 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { action, id, result, read_token, submit_token } = await req.json();
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "create") {
      const { data, error } = await db.from("licence_sessions").insert({})
        .select("id, read_token, submit_token").single();
      if (error) throw error;
      return json({ id: data.id, read_token: data.read_token, submit_token: data.submit_token });
    }
    if (action === "get") {
      if (!id || !read_token) return json({ error: "id and read_token required" }, 400);
      const { data } = await db.from("licence_sessions")
        .select("status, result, read_token, created_at").eq("id", id).maybeSingle();
      // Same response for missing/expired/wrong-token so an id can't be probed.
      if (!data || !isFresh(data.created_at) || !safeEqual(read_token, data.read_token)) {
        return json({ error: "not found" }, 404);
      }
      // Purge the PII once the desktop has read a completed result (one-shot read).
      if (data.status === "done" && data.result) {
        await db.from("licence_sessions").update({ result: null }).eq("id", id);
      }
      return json({ status: data.status, result: data.result });
    }
    if (action === "submit") {
      if (!id || !submit_token) return json({ error: "id and submit_token required" }, 400);
      const { data } = await db.from("licence_sessions")
        .select("status, submit_token, created_at").eq("id", id).maybeSingle();
      if (!data || !isFresh(data.created_at) || !safeEqual(submit_token, data.submit_token)) {
        return json({ error: "not found" }, 404);
      }
      if (data.status === "done") return json({ error: "session already completed" }, 409);
      const { error } = await db.from("licence_sessions")
        .update({ status: "done", result: result || null }).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
