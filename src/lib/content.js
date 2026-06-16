import { supabase } from './supabase.js';

// Content-automation (founder dashboard → Content). All calls are admin-gated
// server-side via is_admin() in the RPCs / edge functions.

// ── Watchlist ─────────────────────────────────────────────────────────────
export async function listWatchlist() {
  const { data, error } = await supabase.rpc('admin_list_watchlist');
  if (error) throw error;
  return data ?? [];
}
export async function upsertWatchlist({ id = null, platform = 'instagram', handle, note = null, active = true }) {
  const { data, error } = await supabase.rpc('admin_upsert_watchlist', {
    p_id: id, p_platform: platform, p_handle: handle, p_note: note, p_active: active,
  });
  if (error) throw error;
  return data;
}
export async function deleteWatchlist(id) {
  const { error } = await supabase.rpc('admin_delete_watchlist', { p_id: id });
  if (error) throw error;
}

// ── Inspiration ───────────────────────────────────────────────────────────
export async function listInspiration(limit = 200) {
  const { data, error } = await supabase.rpc('admin_list_inspiration', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}
// Mine the active watchlist now (Apify) — the daily cron does this automatically too.
export async function runScrape(limitPerHandle = 20) {
  const { data, error } = await supabase.functions.invoke('content-scrape', { body: { limit_per_handle: limitPerHandle } });
  if (error) {
    let msg = error.message;
    try { const b = await error.context?.json(); if (b?.error) msg = b.error; } catch { /* keep generic */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteInspiration(id) {
  const { error } = await supabase.rpc('admin_delete_inspiration', { p_id: id });
  if (error) throw error;
}

// Hand-pick a specific reel/post by URL (enriched with metrics later by the scan).
export async function addInspirationLink(url, note = null) {
  const { data, error } = await supabase.rpc('admin_add_inspiration_link', { p_url: url, p_note: note });
  if (error) throw error;
  return data;
}

// ── Drafts ────────────────────────────────────────────────────────────────
export async function listDrafts(status = null) {
  const { data, error } = await supabase.rpc('admin_list_drafts', { p_status: status });
  if (error) throw error;
  return data ?? [];
}
export async function setDraftStatus(id, status) {
  const { error } = await supabase.rpc('admin_set_draft_status', { p_id: id, p_status: status });
  if (error) throw error;
}
export async function setDraftCaption(id, caption) {
  const { error } = await supabase.rpc('admin_set_draft_caption', { p_id: id, p_caption: caption });
  if (error) throw error;
}
export async function scheduleDraft(draftId, scheduledFor, targets) {
  const { data, error } = await supabase.rpc('admin_schedule_draft', {
    p_draft_id: draftId, p_scheduled_for: scheduledFor, p_targets: targets,
  });
  if (error) throw error;
  return data;
}

// ── Scheduled posts ───────────────────────────────────────────────────────
export async function listContentPosts() {
  const { data, error } = await supabase.rpc('admin_list_content_posts');
  if (error) throw error;
  return data ?? [];
}
