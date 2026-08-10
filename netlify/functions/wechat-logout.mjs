import { SESSION_COOKIE, clearCookie } from './_shared/wechat.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE) } });
}

export const config = { path: '/api/auth/wechat/logout', method: 'POST' };
