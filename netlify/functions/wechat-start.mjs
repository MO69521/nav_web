import { STATE_COOKIE, appRedirect, cookie, createState, env } from './_shared/wechat.mjs';

export default async function handler(request) {
  const appId = env('WECHAT_APP_ID');
  const configuredRedirect = env('WECHAT_REDIRECT_URI');
  if (!appId) return Response.redirect(appRedirect(request, 'config'), 302);

  const state = createState();
  const redirectUri = configuredRedirect || new URL('/api/auth/wechat/callback', request.url).href;
  const authorize = new URL('https://open.weixin.qq.com/connect/qrconnect');
  authorize.searchParams.set('appid', appId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'snsapi_login');
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${authorize.href}#wechat_redirect`,
      'Set-Cookie': cookie(STATE_COOKIE, state)
    }
  });
}

export const config = { path: '/api/auth/wechat/start' };
