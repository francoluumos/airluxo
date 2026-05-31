// Turns a real-world car photo into a clean studio thumbnail.
//
// Primary path: the `studio-shot` Edge Function regenerates the car as a
// photorealistic 3/4 studio shot via Gemini 2.5 Flash Image ("Nano Banana").
// Fallback: if that's unavailable (no GEMINI_API_KEY set, quota, error), we do
// a client-side background-removal cut-out composited on a studio backdrop.
//
// Either way returns an image Blob.

import { supabase } from './supabase.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });
}

// Downscale a File to a JPEG base64 string (no data: prefix) for the API call.
async function fileToBase64(file, max = 1280) {
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
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function base64ToBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Gemini can return the car at varying crops/scales and on a not-quite-white
// backdrop (light grey, soft gradient floor). Normalise so every thumbnail
// matches: sample the corners to learn the background colour, flood-fill the
// background inward from the borders (so white car parts in the interior are
// preserved), force that background to pure white, then re-centre the car on a
// uniform 16:9 white canvas with consistent padding.
async function normalizeStudioImage(blob, { width = 1280, height = 720 } = {}) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const W = img.width;
    const H = img.height;
    const src = document.createElement('canvas');
    src.width = W;
    src.height = H;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(img, 0, 0);

    let imgData;
    try {
      imgData = sctx.getImageData(0, 0, W, H);
    } catch {
      return blob; // can't read pixels — return as-is
    }
    const data = imgData.data;

    // reference background colour: average of the four corners
    let br = 0; let bg = 0; let bb = 0;
    for (const [cx, cy] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) {
      const i = (cy * W + cx) * 4;
      br += data[i]; bg += data[i + 1]; bb += data[i + 2];
    }
    br /= 4; bg /= 4; bb /= 4;
    const TOL = 42; // colour distance tolerance to count as background
    const isBg = (i) => {
      const dr = data[i] - br; const dg = data[i + 1] - bg; const db = data[i + 2] - bb;
      if (dr * dr + dg * dg + db * db <= TOL * TOL) return true;
      return data[i] > 244 && data[i + 1] > 244 && data[i + 2] > 244; // also near-white
    };

    // flood-fill background from the borders so only background-connected pixels
    // are removed (a white roof/wheel inside the car silhouette is kept)
    const mask = new Uint8Array(W * H);
    const stack = [];
    const consider = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const p = y * W + x;
      if (mask[p]) return;
      if (isBg(p * 4)) { mask[p] = 1; stack.push(p); }
    };
    for (let x = 0; x < W; x += 1) { consider(x, 0); consider(x, H - 1); }
    for (let y = 0; y < H; y += 1) { consider(0, y); consider(W - 1, y); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % W; const y = (p / W) | 0;
      consider(x + 1, y); consider(x - 1, y); consider(x, y + 1); consider(x, y - 1);
    }

    // whiten background pixels + measure the car's bounding box
    let minX = W; let minY = H; let maxX = 0; let maxY = 0; let found = false;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        const i = p * 4;
        if (mask[p] || data[i + 3] <= 10) {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
        } else {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
    if (!found) return blob;
    sctx.putImageData(imgData, 0, 0); // src now holds the car on pure white

    const m = Math.round(Math.max(W, H) * 0.012);
    minX = Math.max(0, minX - m);
    minY = Math.max(0, minY - m);
    maxX = Math.min(W - 1, maxX + m);
    maxY = Math.min(H - 1, maxY + m);
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;

    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const padX = width * 0.07;
    const padY = height * 0.11;
    const scale = Math.min((width - padX * 2) / cw, (height - padY * 2) / ch);
    const dw = cw * scale;
    const dh = ch * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;
    ctx.drawImage(src, minX, minY, cw, ch, dx, dy, dw, dh);

    return await new Promise((resolve, reject) =>
      out.toBlob((b) => (b ? resolve(b) : reject(new Error('normalize encode failed'))), 'image/jpeg', 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Identify the car from a photo (make / model / exterior_color / category).
// Returns nulls for anything uncertain; never throws fatally (returns {} on error).
export async function extractCarDetails(file) {
  try {
    const image = await fileToBase64(file);
    const { data, error } = await supabase.functions.invoke('extract-car', {
      body: { image, mimeType: 'image/jpeg' },
    });
    if (error || data?.error) return {};
    return data || {};
  } catch {
    return {};
  }
}

// Place a transparent-background car cut-out centred on a uniform white 16:9
// canvas with consistent padding + a soft contact shadow. This is what makes
// every thumbnail match: same white background, same size, same position.
async function compositeOnWhite(cutoutBlob, { width = 1280, height = 720 } = {}) {
  const url = URL.createObjectURL(cutoutBlob);
  try {
    const car = await loadImage(url);
    const W = car.width;
    const H = car.height;
    // tight bounding box from the alpha channel (cut-outs keep the full canvas)
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(car, 0, 0);
    let minX = W; let minY = H; let maxX = 0; let maxY = 0; let found = false;
    try {
      const a = tctx.getImageData(0, 0, W, H).data;
      const step = Math.max(1, Math.floor(Math.max(W, H) / 1000));
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (a[(y * W + x) * 4 + 3] > 24) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found = true;
          }
        }
      }
    } catch { found = false; }
    if (!found) { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1; }
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;

    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const padX = width * 0.07;
    const padY = height * 0.12;
    const scale = Math.min((width - padX * 2) / cw, (height - padY * 2) / ch);
    const dw = cw * scale;
    const dh = ch * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;

    // soft contact shadow under the car
    ctx.save();
    ctx.filter = 'blur(16px)';
    ctx.fillStyle = 'rgba(11,11,12,0.20)';
    ctx.beginPath();
    ctx.ellipse(width / 2, dy + dh - dh * 0.03, dw * 0.40, dh * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(car, minX, minY, cw, ch, dx, dy, dw, dh);
    return await new Promise((resolve, reject) =>
      out.toBlob((b) => (b ? resolve(b) : reject(new Error('composite encode failed'))), 'image/jpeg', 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Gemini-powered studio shot via the Edge Function. We then run background
// removal on the generated image and recomposite it on a clean white canvas —
// guaranteeing a uniform background + size regardless of the backdrop Gemini
// produced. Throws on any failure (caught by makeStudioThumbnail).
export async function generateStudioShot(file) {
  const image = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke('studio-shot', {
    body: { image, mimeType: 'image/jpeg' },
  });
  if (error) throw error;
  if (!data?.image) throw new Error(data?.error || 'No image returned');
  const raw = base64ToBlob(data.image, data.mimeType || 'image/png');
  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const cut = await removeBackground(raw, { output: { format: 'image/png' } });
    return await compositeOnWhite(cut);
  } catch {
    return normalizeStudioImage(raw); // last-ditch: pixel-normalise the raw shot
  }
}

// Fallback when the Edge Function is unavailable: background removal on the
// original upload, composited on the same white canvas for a consistent look.
export async function localStudioThumbnail(file) {
  const { removeBackground } = await import('@imgly/background-removal');
  const cut = await removeBackground(file, { output: { format: 'image/png' } });
  return compositeOnWhite(cut);
}

// Orchestrator: prefer the Gemini studio shot, fall back to the local cut-out.
export async function makeStudioThumbnail(file) {
  try {
    return await generateStudioShot(file);
  } catch (e) {
    console.warn('[airluxo] studio-shot unavailable, using local cut-out:', e?.message || e);
    return await localStudioThumbnail(file);
  }
}
