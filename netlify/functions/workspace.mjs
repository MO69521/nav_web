import { getStore } from '@netlify/blobs';
import { rejectCrossSiteRequest, requireWorkspaceUser } from './_shared/auth.mjs';
import { normalizeWorkspace } from './_shared/workspace.mjs';

const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
};

function workspaceStore() {
  return getStore({ name: 'mos-workspaces', consistency: 'strong' });
}

export default async function workspaceHandler(request) {
  if (request.method === 'PUT') {
    const crossSiteResponse = rejectCrossSiteRequest(request);
    if (crossSiteResponse) return crossSiteResponse;
  }
  const auth = await requireWorkspaceUser(request);
  if (auth.response) return auth.response;
  const key = `users/${auth.user.storageId}/workspace.json`;
  const store = workspaceStore();

  if (request.method === 'GET') {
    const workspace = await store.get(key, { type: 'json' });
    return new Response(JSON.stringify({ workspace: workspace || null }), { headers: responseHeaders });
  }

  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const workspace = normalizeWorkspace(body.workspace);
      workspace.updatedAt = Date.now();
      await store.setJSON(key, workspace, {
        metadata: {
          schemaVersion: workspace.schemaVersion,
          updatedAt: new Date(workspace.updatedAt).toISOString()
        }
      });
      return new Response(JSON.stringify({ ok: true, updatedAt: workspace.updatedAt }), { headers: responseHeaders });
    } catch (error) {
      const code = String(error?.message || 'invalid_workspace');
      return new Response(JSON.stringify({ error: code }), {
        status: code === 'workspace_too_large' ? 413 : 400,
        headers: responseHeaders
      });
    }
  }

  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { ...responseHeaders, Allow: 'GET, PUT' }
  });
}

export const config = { path: '/api/workspace', method: ['GET', 'PUT'] };
