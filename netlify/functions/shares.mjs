import { getStore } from '@netlify/blobs';
import { rejectCrossSiteRequest, requireWorkspaceUser } from './_shared/auth.mjs';
import { normalizeSharedNote, normalizeSharePermission, normalizeShareToken } from './_shared/note-share.mjs';

const jsonHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
};

function shareStore() {
  return getStore({ name: 'mos-note-shares', consistency: 'strong' });
}

function shareTokenFromRequest(request) {
  const pathname = new URL(request.url).pathname;
  return normalizeShareToken(pathname.split('/').filter(Boolean).pop());
}

function shareResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export default async function shareHandler(request) {
  try {
    const token = shareTokenFromRequest(request);
    const key = `shares/${token}.json`;
    const store = shareStore();

    if (request.method === 'GET') {
      const share = await store.get(key, { type: 'json' });
      if (!share) return shareResponse({ error: 'share_not_found' }, 404);
      return shareResponse({ note: share.note, permission: share.permission, updatedAt: share.updatedAt });
    }

    if (request.method === 'PUT') {
      const crossSiteResponse = rejectCrossSiteRequest(request);
      if (crossSiteResponse) return crossSiteResponse;
      const auth = await requireWorkspaceUser(request);
      if (auth.response) return auth.response;
      const existing = await store.get(key, { type: 'json' });
      if (existing?.ownerId && existing.ownerId !== auth.user.storageId) return shareResponse({ error: 'share_forbidden' }, 403);
      const body = await request.json();
      const share = {
        ownerId: auth.user.storageId,
        permission: normalizeSharePermission(body.permission),
        note: normalizeSharedNote(body.note),
        updatedAt: Date.now()
      };
      await store.setJSON(key, share, { metadata: { ownerId: share.ownerId, permission: share.permission } });
      return shareResponse({ ok: true, updatedAt: share.updatedAt });
    }

    if (request.method === 'PATCH') {
      const crossSiteResponse = rejectCrossSiteRequest(request);
      if (crossSiteResponse) return crossSiteResponse;
      const existing = await store.get(key, { type: 'json' });
      if (!existing) return shareResponse({ error: 'share_not_found' }, 404);
      if (existing.permission !== 'edit') return shareResponse({ error: 'share_read_only' }, 403);
      const body = await request.json();
      existing.note = normalizeSharedNote(body.note);
      existing.updatedAt = Date.now();
      await store.setJSON(key, existing, { metadata: { ownerId: existing.ownerId, permission: existing.permission } });
      return shareResponse({ ok: true, updatedAt: existing.updatedAt });
    }

    if (request.method === 'DELETE') {
      const crossSiteResponse = rejectCrossSiteRequest(request);
      if (crossSiteResponse) return crossSiteResponse;
      const auth = await requireWorkspaceUser(request);
      if (auth.response) return auth.response;
      const existing = await store.get(key, { type: 'json' });
      if (existing?.ownerId && existing.ownerId !== auth.user.storageId) return shareResponse({ error: 'share_forbidden' }, 403);
      await store.delete(key);
      return shareResponse({ ok: true });
    }

    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...jsonHeaders, Allow: 'GET, PUT, PATCH, DELETE' }
    });
  } catch (error) {
    const code = String(error?.message || 'invalid_share');
    return shareResponse({ error: code }, code === 'shared_note_too_large' ? 413 : 400);
  }
}

export const config = { path: '/api/shares/:token', method: ['GET', 'PUT', 'PATCH', 'DELETE'] };
