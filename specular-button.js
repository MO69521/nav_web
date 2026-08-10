const DEFAULTS = {
  proximity: 250,
  smoothing: 0.16
};

let pointerX = -10000;
let pointerY = -10000;
let frame = 0;
const instances = new Set();

function shortestAngle(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function update() {
  frame = 0;
  let needsAnotherFrame = false;

  instances.forEach(instance => {
    const { element, options } = instance;
    if (!element.isConnected) {
      instances.delete(instance);
      return;
    }

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const edgeX = Math.max(rect.left - pointerX, 0, pointerX - rect.right);
    const edgeY = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom);
    const distance = Math.hypot(edgeX, edgeY);

    let targetAngle;
    if (distance === 0) {
      const normalX = (pointerX - centerX) / Math.max(rect.width / 2, 1);
      const normalY = (centerY - pointerY) / Math.max(rect.height / 2, 1);
      targetAngle = Math.atan2(2 / rect.height, -2 / rect.width) + normalX * 0.3 + normalY * 0.15;
    } else {
      targetAngle = Math.atan2(centerY - pointerY, pointerX - centerX);
    }

    const rawProximity = Math.max(0, 1 - distance / Math.max(options.proximity, 1));
    const targetOpacity = rawProximity * rawProximity * (3 - 2 * rawProximity);
    const angleDelta = shortestAngle(instance.angle, targetAngle);
    const opacityDelta = targetOpacity - instance.opacity;
    instance.angle += angleDelta * options.smoothing;
    instance.opacity += opacityDelta * options.smoothing;
    needsAnotherFrame ||= Math.abs(angleDelta) > 0.002 || Math.abs(opacityDelta) > 0.002;

    element.style.setProperty('--specular-angle', `${instance.angle}rad`);
    element.style.setProperty('--specular-opacity', instance.opacity.toFixed(3));
  });

  if (needsAnotherFrame) requestUpdate();
}

function requestUpdate() {
  if (!frame) frame = requestAnimationFrame(update);
}

function handlePointerMove(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  requestUpdate();
}

function handlePointerLeave() {
  pointerX = -10000;
  pointerY = -10000;
  requestUpdate();
}

window.addEventListener('pointermove', handlePointerMove, { passive: true });
document.documentElement.addEventListener('pointerleave', handlePointerLeave, { passive: true });

export function createSpecularButton(element, options = {}) {
  if (!element) return () => {};

  const glowLayer = element.matches('button, [role="button"]')
    ? Object.assign(document.createElement('span'), { className: 'specular-button-glow' })
    : null;
  if (glowLayer) {
    glowLayer.setAttribute('aria-hidden', 'true');
    element.prepend(glowLayer);
  }

  const instance = {
    element,
    options: { ...DEFAULTS, ...options },
    angle: 2.4,
    opacity: 0
  };

  element.classList.add('specular-button');
  instances.add(instance);
  requestUpdate();

  return () => {
    instances.delete(instance);
    glowLayer?.remove();
    element.classList.remove('specular-button');
    element.style.removeProperty('--specular-angle');
    element.style.removeProperty('--specular-opacity');
  };
}

export function createSpecularButtonGroup(root = document, options = {}) {
  const cleanups = new Map();
  const selector = 'button:not(.category-add):not(.add-site-card), [role="button"]:not(.category-add), .add-site-card > span';
  const textButtonSelector = '.workspace-nav button, .category-tabs .nav-item, .gallery-mode-tabs button, .quick-searches button, .engine-select > button, .auth-switch button, .note-list-item, .note-slash-item';

  function connect(element) {
    if (!(element instanceof Element) || !element.matches(selector) || element.matches(textButtonSelector) || cleanups.has(element)) return;
    cleanups.set(element, createSpecularButton(element, options));
  }

  function scan(node) {
    if (!(node instanceof Element || node instanceof Document)) return;
    if (node instanceof Element) connect(node);
    node.querySelectorAll(selector).forEach(connect);
  }

  function disconnect(node) {
    if (!(node instanceof Element)) return;
    if (cleanups.has(node)) {
      cleanups.get(node)();
      cleanups.delete(node);
    }
    node.querySelectorAll(selector).forEach(element => {
      cleanups.get(element)?.();
      cleanups.delete(element);
    });
  }

  scan(root);
  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.removedNodes.forEach(disconnect);
      record.addedNodes.forEach(scan);
    });
  });
  observer.observe(root, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    cleanups.forEach(cleanup => cleanup());
    cleanups.clear();
  };
}
