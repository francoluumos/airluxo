// Swiss address autocomplete via the Federal geo API (api3.geo.admin.ch).
// Free, no API key, CH-only. To support international partners, swap this module
// for Google Places (keep the same returned shape). See BACKLOG.md.

const ENDPOINT = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';

const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// Parse a SearchServer address hit into structured fields.
// attrs.label looks like: "Golattenmattgasse 21 <b>5000 Aarau</b>"
function parse(attrs) {
  if (!attrs) return null;
  const raw = attrs.label || '';
  const boldMatch = /<b>(.*?)<\/b>/.exec(raw);
  const cityPart = stripHtml(boldMatch ? boldMatch[1] : '');           // "5000 Aarau"
  const streetPart = stripHtml(raw.replace(/<b>.*?<\/b>/, ''));        // "Golattenmattgasse 21"

  const zipCity = /^(\d{4})\s+(.*)$/.exec(cityPart);
  const zip = zipCity ? zipCity[1] : '';
  const city = zipCity ? zipCity[2] : cityPart;

  // last token starting with a digit is the house number (handles "21", "21a", "21-23")
  let street = streetPart;
  let street_number = '';
  const sm = /^(.*?)\s+(\d+\s*[a-zA-Z]?(?:[-–]\d+\s*[a-zA-Z]?)?)$/.exec(streetPart);
  if (sm) { street = sm[1].trim(); street_number = sm[2].replace(/\s+/g, ''); }

  const label = stripHtml(raw);
  return {
    label,
    address: label,
    street,
    street_number,
    zip,
    city,
    country: 'Switzerland',
    lat: attrs.lat ?? null,
    lng: attrs.lon ?? null,
  };
}

// Swiss place/city suggestions (municipalities + postal places) with coordinates,
// for the marketplace "Where" search. [] on error/short input.
export async function searchSwissPlaces(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const url = `${ENDPOINT}?type=locations&origins=gg25,zipcode&limit=8&sr=4326&searchText=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .map((r) => ({ label: stripHtml(r.attrs?.label), lat: r.attrs?.lat ?? null, lng: r.attrs?.lon ?? null }))
      .filter((p) => p.label && p.lat != null && p.lng != null);
  } catch {
    return [];
  }
}

// Returns up to 8 parsed Swiss address suggestions for a query. [] on error/short input.
export async function searchSwissAddress(query) {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  const url = `${ENDPOINT}?type=locations&origins=address&limit=8&sr=4326&searchText=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r) => parse(r.attrs)).filter(Boolean);
  } catch {
    return [];
  }
}
