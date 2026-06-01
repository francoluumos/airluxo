import { supabase } from './supabase.js';
import { mapListing } from './listings.js';

// Saved cars (wishlist). All queries are RLS-scoped to the signed-in user
// (auth.uid() = user_id), so no explicit user filter is needed on read/delete.

// Set of listing_ids the current user has saved (for hydrating heart state).
export async function fetchFavouriteIds() {
  const { data, error } = await supabase.from('favourites').select('listing_id');
  if (error) return [];
  return new Set((data ?? []).map((r) => r.listing_id));
}

export async function addFavourite(listingId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('favourites').insert({ user_id: user.id, listing_id: listingId });
  if (error && error.code !== '23505') throw error; // ignore "already saved"
}

export async function removeFavourite(listingId) {
  const { error } = await supabase.from('favourites').delete().eq('listing_id', listingId);
  if (error) throw error;
}

// Saved cars as marketplace-shaped objects (skips drafts / removed listings).
export async function fetchSavedCars() {
  const ids = await fetchFavouriteIds();
  if (!ids.size) return [];
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .in('id', [...ids])
    .neq('status', 'Draft');
  if (error) return [];
  return (data ?? []).map(mapListing);
}
