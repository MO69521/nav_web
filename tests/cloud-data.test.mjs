import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_WORKSPACE_BYTES, normalizeWorkspace } from '../netlify/functions/_shared/workspace.mjs';
import { normalizeSharedNote, normalizeSharePermission, normalizeShareToken } from '../netlify/functions/_shared/note-share.mjs';
import { currentWorkspaceUser, rejectCrossSiteRequest } from '../netlify/functions/_shared/auth.mjs';
import { createShareToken, isSafeNoteImageSource } from '../cloud-content.js';

test('workspace normalization keeps supported collections and settings', () => {
  const workspace = normalizeWorkspace({ customSites: [{ id: 'one' }], notes: [{ id: 'note' }], settings: { lightTheme: true } });
  assert.equal(workspace.schemaVersion, 1);
  assert.deepEqual(workspace.customSites, [{ id: 'one' }]);
  assert.deepEqual(workspace.notes, [{ id: 'note' }]);
  assert.equal(workspace.settings.lightTheme, true);
  assert.deepEqual(workspace.galleryItems, []);
});

test('workspace rejects invalid and oversized input', () => {
  assert.throws(() => normalizeWorkspace(null), /invalid_workspace/);
  assert.throws(() => normalizeWorkspace({ notes: [{ content: 'x'.repeat(MAX_WORKSPACE_BYTES) }] }), /workspace_too_large/);
});

test('share input validation accepts safe tokens and clamps public fields', () => {
  assert.equal(normalizeShareToken('abcDEF_123456789'), 'abcDEF_123456789');
  assert.throws(() => normalizeShareToken('../unsafe'), /invalid_share_token/);
  assert.equal(normalizeSharePermission('edit'), 'edit');
  assert.equal(normalizeSharePermission('owner'), 'view');
  const note = normalizeSharedNote({ id: 'n', title: 'x'.repeat(100), content: '<p>hello</p>' });
  assert.equal(note.title.length, 80);
  assert.equal(note.content, '<p>hello</p>');
});

test('shared notes reject oversized content', () => {
  assert.throws(() => normalizeSharedNote({ content: 'x'.repeat(2_600_000) }), /shared_note_too_large/);
});

test('cloud media paths survive note sanitization checks', () => {
  assert.equal(isSafeNoteImageSource('/media/abcdefghijklmnopqrstuvwxyz'), true);
  assert.equal(isSafeNoteImageSource('https://images.example.com/reference.webp'), true);
  assert.equal(isSafeNoteImageSource('/media/../../secret'), false);
  assert.equal(isSafeNoteImageSource('javascript:alert(1)'), false);
});

test('share tokens use URL-safe high-entropy bytes', () => {
  const token = createShareToken({ getRandomValues(bytes) { bytes.forEach((_, index) => { bytes[index] = index; }); } });
  assert.match(token, /^[a-zA-Z0-9_-]{32}$/);
  assert.equal(token, 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYX');
});

test('cross-site mutation requests are rejected', async () => {
  const blocked = rejectCrossSiteRequest(new Request('https://mos.example/api/workspace', {
    method: 'PUT',
    headers: { Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'cross-site' }
  }));
  assert.equal(blocked.status, 403);
  assert.deepEqual(await blocked.json(), { error: 'cross_site_request' });
  assert.equal(rejectCrossSiteRequest(new Request('https://mos.example/api/workspace', {
    method: 'PUT',
    headers: { Origin: 'https://mos.example', 'Sec-Fetch-Site': 'same-origin' }
  })), null);
});

test('workspace auth validates an explicit Identity bearer token', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/.netlify/identity/user');
    assert.equal(options.headers.Authorization, 'Bearer valid-test-token');
    return Response.json({ id: 'identity-user-1', email: 'user@example.com' });
  };
  try {
    const user = await currentWorkspaceUser(new Request('https://example.com/api/workspace', {
      headers: { Authorization: 'Bearer valid-test-token' }
    }));
    assert.equal(user.id, 'identity-user-1');
    assert.equal(user.email, 'user@example.com');
    assert.equal(user.provider, 'identity');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
