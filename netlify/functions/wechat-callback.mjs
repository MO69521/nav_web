import { SESSION_COOKIE, STATE_COOKIE, appRedirect, clearCookie, cookie, env, parseCookies, signSession } from './_shared/wechat.mjs';

export default async function handler(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request);
  const appId = env('WECHAT_APP_ID');
  const appSecret = env('WECHAT_APP_SECRET');
  const errorRedirect = status => new Response(null, {
    status: 302,
    headers: { Location: appRedirect(request, status).href, 'Set-Cookie': clearCookie(STATE_COOKIE) }
  });

  if (!appId || !appSecret || !env('WECHAT_SESSION_SECRET')) return errorRedirect('config');
  if (!code || !state || state !== cookies[STATE_COOKIE]) return errorRedirect('state');

  try {
    const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    tokenUrl.searchParams.set('appid', appId);
    tokenUrl.searchParams.set('secret', appSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    const token = await fetch(tokenUrl).then(response => response.json());
    if (!token.access_token || !token.openid) return errorRedirect('denied');

    const profileUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
    profileUrl.searchParams.set('access_token', token.access_token);
    profileUrl.searchParams.set('openid', token.openid);
    profileUrl.searchParams.set('lang', 'zh_CN');
    const profile = await fetch(profileUrl).then(response => response.json());
    if (!profile.openid) return errorRedirect('profile');

    const session = signSession({
      provider: 'wechat',
      id: profile.unionid || profile.openid,
      openid: profile.openid,
      name: profile.nickname || '微信用户',
      avatar: profile.headimgurl || ''
    });
    return new Response(null, {
      status: 302,
      headers: [
        ['Location', appRedirect(request, 'success').href],
        ['Set-Cookie', clearCookie(STATE_COOKIE)],
        ['Set-Cookie', cookie(SESSION_COOKIE, session, { maxAge: 30 * 24 * 60 * 60 })]
      ]
    });
  } catch {
    return errorRedirect('network');
  }
}

export const config = { path: '/api/auth/wechat/callback' };
