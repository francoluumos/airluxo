import { supabase } from './supabase.js';

const BUCKET = 'listing-photos';

// Listings owned by the signed-in partner. We filter by partner_id explicitly:
// the public-read RLS policy (for the marketplace) would otherwise also expose
// other partners' live cars to this query.
export async function fetchMyListings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('partner_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Generate an evocative car description with AI (partner "list a car" form).
export async function generateCarDescription(fields) {
  const { data, error } = await supabase.functions.invoke('generate-description', { body: fields });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.description;
}

export async function createListing(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('listings')
    .insert({ ...payload, partner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// CSV/Excel import. Rows WITHOUT id are inserted; rows WITH id update that
// listing (RLS scopes updates to the owner). Returns { inserted, updated }.
export async function importListings(rows) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const inserts = rows.filter((r) => !r.id).map((r) => ({ ...r, partner_id: user.id, status: r.status || 'Available' }));
  const updates = rows.filter((r) => r.id);

  if (inserts.length) {
    const { error } = await supabase.from('listings').insert(inserts);
    if (error) throw error;
  }
  for (const r of updates) {
    const { id, ...patch } = r; // never change owner; host_name kept
    const { error } = await supabase.from('listings').update(patch).eq('id', id);
    if (error) throw error;
  }
  return { inserted: inserts.length, updated: updates.length };
}

export async function updateListing(id, patch) {
  const { data, error } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteListing(id) {
  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) throw error;
}

// Uploads a File or generated Blob to listing-photos/<uid>/<uuid>.<ext>.
// Pass `ext` explicitly for Blobs (which have no filename). Returns a public URL.
export async function uploadListingPhoto(file, ext) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const extension = (ext || (file.name && file.name.split('.').pop()) || 'jpg').toLowerCase();
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const contentType = file.type || (extension === 'png' ? 'image/png' : 'image/jpeg');

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Upload a short listing video (optional). Same public bucket, per-user folder.
export async function uploadListingVideo(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const extension = (file.name && file.name.split('.').pop() || 'mp4').toLowerCase();
  const path = `${user.id}/video-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'video/mp4' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ---- public marketplace ----

// Any live (non-draft) listing — readable by anyone via the public-read RLS policy.
export async function fetchPublicListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .neq('status', 'Draft')
    .eq('is_prospect', false)   // hide sales-preview (prospect) cars from the marketplace
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Pick-up logistics (opening hours + pick-up address) for the guest booking flow.
// Backed by a SECURITY DEFINER RPC so it works for anonymous guests without
// exposing the partners table. Returns null if unavailable.
export async function fetchListingLogistics(listingId) {
  const { data, error } = await supabase.rpc('listing_logistics', { p_listing_id: listingId });
  if (error) return null;
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

// Map pins (real pick-up coordinates) for the homepage map. [] on failure.
export async function fetchFleetPins() {
  const { data, error } = await supabase.rpc('fleet_pins');
  if (error) return [];
  return data ?? [];
}

// A published partner's fleet for their white-label site (/p/<slug> or own domain).
// Uses a security-definer RPC so cars show even while the partner is still a pipeline
// prospect (the anon listings policy hides prospect rows from the marketplace).
export async function fetchPartnerSiteListings(partnerId) {
  const { data, error } = await supabase.rpc('public_partner_listings', { p_partner_id: partnerId });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

// One partner's live cars — for the embeddable widget on their own site.
export async function fetchPartnerListings(partnerId) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('partner_id', partnerId)
    .neq('status', 'Draft')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

// Sales-preview cars for a prospect partner — only returns rows when the preview
// token matches (prospect listings are hidden from the public read policy).
export async function fetchPreviewListings(partnerId, token) {
  const { data, error } = await supabase.rpc('preview_listings', { p_partner_id: partnerId, p_token: token });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

// Adapt a DB listing row to the shape the marketplace components expect.
export function mapListing(row) {
  const rating = row.rating != null ? Number(row.rating) : null;
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    category: row.category,
    pricePerDay: Number(row.price_per_day),
    location: row.city || 'Switzerland',
    rating,
    trips: row.trips ?? 0,
    seats: row.seats,
    power: row.power,
    accel: row.accel != null ? Number(row.accel) : null,
    gearbox: row.gearbox,
    fuel: row.fuel,
    image: row.photo_url || null,
    photos: Array.isArray(row.photos) ? row.photos : [],
    video: row.video_url || null,
    tint: '#191a1e',
    host: { name: row.host_name || 'AIRLUXO partner', rating, trips: row.trips ?? 0, since: null },
    exterior_color: row.exterior_color,
    interior_color: row.interior_color,
    cross_border_allowed: row.cross_border_allowed,
    cross_border_fee: row.cross_border_fee != null ? Number(row.cross_border_fee) : null,
    delivery_available: !!row.delivery_available,
    delivery_fee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
    protection_available: !!row.protection_available,
    protection_fee: row.protection_fee != null ? Number(row.protection_fee) : null,
    deposit_amount: row.deposit_amount != null ? Number(row.deposit_amount) : null,
    delivery_note: row.delivery_note || null,
    rate_tiers: Array.isArray(row.rate_tiers) ? row.rate_tiers : [],
    year: row.year,
    mileage_per_day: row.mileage_per_day,
    description: row.description || null,
  };
}
