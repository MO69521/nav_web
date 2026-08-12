import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAttemptCloudBaseSignup, createPublicShareURL, createShareToken, isExistingCloudBaseAccountError, isSafeNoteImageSource, shouldPreferLocalNote } from '../cloud-content.js';

test('supported note image sources reject executable URLs', () => {
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

test('public share links use the canonical production origin without carrying preview paths', () => {
  assert.equal(
    createPublicShareURL('abc_DEF-123', 'https://preview.example/private/path?draft=1#old', 'https://nav.example.com'),
    'https://nav.example.com/#share=abc_DEF-123'
  );
});

test('ambiguous CloudBase credential failures can fall back to signup', () => {
  assert.equal(canAttemptCloudBaseSignup({ code: 'invalid_credentials', message: 'Invalid login credentials' }), true);
  assert.equal(canAttemptCloudBaseSignup({ code: 'rate_limit', message: 'Try again later' }), false);
  assert.equal(isExistingCloudBaseAccountError({ code: 'user_already_exists', message: 'User already registered' }), true);
  assert.equal(isExistingCloudBaseAccountError({ code: 'weak_password', message: 'Password is too weak' }), false);
});

test('CloudBase rules keep workspaces private and shared notes publicly readable', () => {
  const workspaceRules = JSON.parse(readFileSync(new URL('../cloudbase/rules/mos_workspaces.json', import.meta.url), 'utf8'));
  const shareRules = JSON.parse(readFileSync(new URL('../cloudbase/rules/mos_note_shares.json', import.meta.url), 'utf8'));
  assert.match(workspaceRules.read, /doc\._id == auth\.uid/);
  assert.match(workspaceRules.create, /doc\.ownerId == auth\.uid/);
  assert.match(workspaceRules.write || workspaceRules.update, /ANONYMOUS/);
  assert.equal(shareRules.read, 'doc.enabled == true');
  assert.match(shareRules.update, /permission == 'edit'/);
  assert.match(shareRules.delete, /doc\.ownerId == auth\.uid/);
});

test('a fresh device does not replace an edited cloud welcome note with its newer default copy', () => {
  const pristine = { id: 'note-welcome', title: '欢迎使用笔记', content: '<p>默认内容</p>', updatedAt: 300 };
  const cloud = { ...pristine, content: '<p>云端真实内容</p>', updatedAt: 200 };
  assert.equal(shouldPreferLocalNote(pristine, cloud, pristine), false);
  assert.equal(shouldPreferLocalNote({ ...pristine, content: '<p>本机修改</p>' }, cloud, pristine), true);
});
