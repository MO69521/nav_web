import { randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { rejectCrossSiteRequest, requireWorkspaceUser } from './_shared/auth.mjs';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const jsonHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
};

export default async function mediaUploadHandler(request) {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...jsonHeaders, Allow: 'POST' } });
  const crossSiteResponse = rejectCrossSiteRequest(request);
  if (crossSiteResponse) return crossSiteResponse;
  const auth = await requireWorkspaceUser(request);
  if (auth.response) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob) || !allowedTypes.has(file.type)) return new Response(JSON.stringify({ error: 'invalid_image' }), { status: 400, headers: jsonHeaders });
    if (file.size > MAX_IMAGE_BYTES) return new Response(JSON.stringify({ error: 'image_too_large' }), { status: 413, headers: jsonHeaders });
    const assetId = randomBytes(18).toString('base64url');
    const store = getStore({ name: 'mos-media', consistency: 'strong' });
    await store.set(`public/${assetId}`, file, {
      metadata: { ownerId: auth.user.storageId, contentType: file.type, size: file.size, uploadedAt: new Date().toISOString() }
    });
    return new Response(JSON.stringify({ ok: true, url: `/media/${assetId}` }), { headers: jsonHeaders });
  } catch {
    return new Response(JSON.stringify({ error: 'image_upload_failed' }), { status: 400, headers: jsonHeaders });
  }
}

export const config = { path: '/api/media', method: 'POST' };
