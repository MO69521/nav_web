function escapeLabel(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

export function rollingNavLabel(label) {
  const safeLabel = escapeLabel(label);
  return `<span class="rolling-nav-text" aria-hidden="true"><span class="rolling-nav-copy">${safeLabel}</span><span class="rolling-nav-copy rolling-nav-copy-incoming">${safeLabel}</span></span>`;
}

export function hydrateRollingNavLabels(root = document) {
  root.querySelectorAll('[data-rolling-nav-label]').forEach(control => {
    const label = control.dataset.rollingNavLabel || control.textContent.trim();
    control.classList.add('rolling-nav-host');
    control.setAttribute('aria-label', label);
    control.innerHTML = rollingNavLabel(label);
  });
}
