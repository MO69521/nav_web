import { createHash } from 'node:crypto';
import { getUser } from '@netlify/identity';

function storageId(provider, id) {
  return createHash('sha256').update(`${provider}:${id}`).digest('hex').slice(0, 40);
}

export async function currentWorkspaceUser(request) {
  let identityUser = await getUser().catch(() => null);
  const authorization = request.headers.get('authorization');
  if (!identityUser?.id && authorization?.startsWith('Bearer ')) {
    const identityURL = new URL('/.netlify/identity/user', request.url);
    const response = await fetch(identityURL, { headers: { Authorization: authorization } }).catch(() => null);
    if (response?.ok) identityUser = await response.json().catch(() => null);
  }
  if (identityUser?.id) {
    return {
      id: identityUser.id,
      provider: 'identity',
      email: identityUser.email || '',
      storageId: storageId('identity', identityUser.id)
    };
  }

  return null;
}

export async function requireWorkspaceUser(request) {
  const user = await currentWorkspaceUser(request);
  if (user) return { user, response: null };
  return {
    user: null,
    response: Response.json({ error: 'unauthorized' }, {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff'
      }
    })
  };
}

export function rejectCrossSiteRequest(request) {
  const site = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;
  const crossSite = site === 'cross-site' || (origin && origin !== requestOrigin);
  if (!crossSite) return null;
  return Response.json({ error: 'cross_site_request' }, {
    status: 403,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
