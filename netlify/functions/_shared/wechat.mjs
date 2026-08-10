import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const STATE_COOKIE = 'mos_wechat_oauth_state';
export const SESSION_COOKIE = 'mos_wechat_session';

export function env(name) {
  return Netlify.env.get(name) || '';
}

export function parseCookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(Boolean).map(value => {
    const index = value.indexOf('=');
    return [value.slice(0, index), decodeURIComponent(value.slice(index + 1))];
  }));
}

export function cookie(name, value, { maxAge = 600 } = {}) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function createState() {
  return randomBytes(24).toString('base64url');
}

export function signSession(profile) {
  const secret = env('WECHAT_SESSION_SECRET');
  if (!secret) throw new Error('missing_session_secret');
  const payload = Buffer.from(JSON.stringify({ ...profile, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySession(value) {
  const secret = env('WECHAT_SESSION_SECRET');
  if (!secret || !value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const givenBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (givenBuffer.length !== expectedBuffer.length || !timingSafeEqual(givenBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function appRedirect(request, status) {
  const url = new URL('/', request.url);
  url.searchParams.set('wechat_login', status);
  return url;
}
