import { getStore } from '@netlify/blobs';

export default async function mediaGetHandler(request) {
  const assetId = new URL(request.url).pathname.split('/').filter(Boolean).pop();
  if (!/^[a-zA-Z0-9_-]{20,64}$/.test(assetId || '')) return new Response('Not found', { status: 404 });
  const store = getStore({ name: 'mos-media' });
  const result = await store.getWithMetadata(`public/${assetId}`, { type: 'blob' });
  if (!result) return new Response('Not found', { status: 404 });
  return new Response(result.data, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(result.data.size),
      'Content-Type': String(result.metadata?.contentType || result.data.type || 'application/octet-stream'),
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export const config = { path: '/media/:assetId', method: 'GET' };
