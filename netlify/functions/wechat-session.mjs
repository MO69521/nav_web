import { SESSION_COOKIE, parseCookies, verifySession } from './_shared/wechat.mjs';

export default async function handler(request) {
  const session = verifySession(parseCookies(request)[SESSION_COOKIE]);
  return Response.json({ user: session ? {
    id: session.id,
    name: session.name,
    provider: 'wechat',
    avatar: session.avatar,
    user_metadata: { full_name: session.name, avatar_url: session.avatar }
  } : null }, { headers: { 'Cache-Control': 'no-store' } });
}

export const config = { path: '/api/auth/wechat/session' };
