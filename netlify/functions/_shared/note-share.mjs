const MAX_SHARE_BYTES = 2_500_000;

export function normalizeShareToken(value) {
  const token = String(value || '').trim();
  if (!/^[a-zA-Z0-9_-]{12,96}$/.test(token)) throw new Error('invalid_share_token');
  return token;
}

export function normalizeSharedNote(value) {
  const source = value && typeof value === 'object' ? value : {};
  const note = {
    id: String(source.id || 'shared-note').slice(0, 160),
    title: String(source.title || '无标题文档').slice(0, 80),
    content: String(source.content || ''),
    updatedAt: Number(source.updatedAt) || Date.now()
  };
  if (Buffer.byteLength(JSON.stringify(note), 'utf8') > MAX_SHARE_BYTES) throw new Error('shared_note_too_large');
  return note;
}

export function normalizeSharePermission(value) {
  return value === 'edit' ? 'edit' : 'view';
}
