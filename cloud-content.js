export function createShareToken(cryptoSource = globalThis.crypto) {
  if (!cryptoSource?.getRandomValues) throw new Error('secure_random_unavailable');
  const bytes = new Uint8Array(24);
  cryptoSource.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function createPublicShareURL(token, currentURL, publicSiteURL = '') {
  const baseURL = publicSiteURL ? new URL(publicSiteURL) : new URL(currentURL);
  baseURL.pathname = '/';
  baseURL.search = '';
  baseURL.hash = `share=${encodeURIComponent(String(token || ''))}`;
  return baseURL.toString();
}

function authErrorText(error) {
  return `${error?.code || ''} ${error?.message || ''}`;
}

export function canAttemptCloudBaseSignup(error) {
  return /not.?found|user.*not.*exist|failed_precondition|invalid.*password|invalid.*credential|password.*incorrect|unauthorized/i.test(authErrorText(error));
}

export function isExistingCloudBaseAccountError(error) {
  return /already.*(exist|register)|user.*exist|email.*(exist|register)|duplicate/i.test(authErrorText(error));
}

export function isSafeNoteImageSource(value) {
  const source = String(value || '');
  return /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(source)
    || /^https:\/\//i.test(source)
    || /^\/media\/[a-zA-Z0-9_-]{20,64}$/.test(source);
}

export function shouldPreferLocalNote(localNote, cloudNote, pristineNote) {
  if (!cloudNote) return true;
  const isPristineLocal = localNote?.id === pristineNote?.id
    && localNote?.title === pristineNote?.title
    && localNote?.content === pristineNote?.content;
  const cloudHasRealEdits = cloudNote?.title !== pristineNote?.title
    || cloudNote?.content !== pristineNote?.content;
  if (isPristineLocal && cloudHasRealEdits) return false;
  return Number(localNote?.updatedAt) >= Number(cloudNote?.updatedAt);
}
