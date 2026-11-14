// Code partagé par les fonctions Netlify de l'outil « Annonce IA ».
import crypto from 'node:crypto';

const env = k => process.env[k] || '';

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export function siteUrl(req) {
  return env('URL') || new URL(req.url).origin;
}

/* ---------- Stripe (API REST, sans dépendance) ---------- */
function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v && typeof v === 'object') form(v, key, out);
    else if (v !== undefined) out.append(key, String(v));
  }
  return out;
}

export async function stripe(path, { method = 'GET', body } = {}) {
  const key = env('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY manquante dans Netlify.');
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method,
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? form(body) : undefined
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Stripe : ' + (j.error?.message || r.status));
  return j;
}

export async function abonnementActif(customerId) {
  const subs = await stripe(`subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`);
  return subs.data.some(s => s.status === 'active' || s.status === 'trialing');
}

/* ---------- Jeton d'accès signé (HMAC) ---------- */
const b64 = s => Buffer.from(s).toString('base64url');

function signe(data) {
  const secret = env('ACCESS_SECRET');
  if (secret.length < 32) throw new Error('ACCESS_SECRET manquant ou trop court (32 caractères minimum).');
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function creerJeton(customerId) {
  const data = b64(JSON.stringify({ c: customerId, e: Date.now() + 180 * 864e5 }));
  return data + '.' + signe(data);
}

export function lireJeton(jeton) {
  if (typeof jeton !== 'string' || !jeton.includes('.')) return null;
  const [data, sig] = jeton.split('.');
  const attendu = signe(data);
  if (sig.length !== attendu.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString());
    return p.e > Date.now() && typeof p.c === 'string' ? p.c : null;
  } catch { return null; }
}
