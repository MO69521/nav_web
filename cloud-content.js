export function createShareToken(cryptoSource = globalThis.crypto) {
  if (!cryptoSource?.getRandomValues) throw new Error('secure_random_unavailable');
  const bytes = new Uint8Array(24);
  cryptoSource.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function isSafeNoteImageSource(value) {
  const source = String(value || '');
  return /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(source)
    || /^https:\/\//i.test(source)
    || /^\/media\/[a-zA-Z0-9_-]{20,64}$/.test(source);
}
