import { supabase } from './supabase.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });
}

async function fileToBase64(file, max = 1500) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Extracts licence fields from a photo via the verify-licence Edge Function.
// Returns { first_name, last_name, birth_date, valid_from, categories[], number }.
export async function verifyLicence(file) {
  const image = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke('verify-licence', {
    body: { image, mimeType: 'image/jpeg' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---- desktop ↔ mobile hand-off ----
export async function createLicenceSession() {
  const { data, error } = await supabase.functions.invoke('licence-session', { body: { action: 'create' } });
  if (error) throw error;
  return data.id;
}

export async function getLicenceSession(id) {
  const { data, error } = await supabase.functions.invoke('licence-session', { body: { action: 'get', id } });
  if (error) throw error;
  return data; // { status, result }
}

export async function submitLicenceSession(id, result) {
  const { data, error } = await supabase.functions.invoke('licence-session', { body: { action: 'submit', id, result } });
  if (error) throw error;
  return data;
}
