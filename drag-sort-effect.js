export function createDragSortEffect({ container, itemSelector }) {
  const reflowStates = new WeakMap();
  let source = null;
  let ghost = null;
  let lastX = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerOffsetX = 0;
  let pointerOffsetY = 0;
  let ghostWidth = 0;
  let ghostHeight = 0;
  let magnetTarget = null;
  let magnetStrength = 0;

  function items() {
    return [...container.querySelectorAll(itemSelector)];
  }

  function positionGhost() {
    if (!ghost) return;
    let left = pointerX - pointerOffsetX;
    let top = pointerY - pointerOffsetY;
    if (magnetTarget?.isConnected && magnetStrength > 0) {
      const rect = magnetTarget.getBoundingClientRect();
      const targetLeft = rect.left + (rect.width - ghostWidth) / 2;
      const targetTop = rect.top + (rect.height - ghostHeight) / 2;
      left += (targetLeft - left) * magnetStrength;
      top += (targetTop - top) * magnetStrength;
    }
    ghost.style.left = `${left}px`;
    ghost.style.top = `${top}px`;
  }

  function move(event) {
    if (!ghost) return;
    const tilt = Math.max(-4, Math.min(4, (event.clientX - lastX) * .28));
    lastX = event.clientX;
    pointerX = event.clientX;
    pointerY = event.clientY;
    ghost.style.setProperty('--sort-ghost-tilt', `${tilt}deg`);
    positionGhost();
  }

  function setMagnetTarget(target = null, strength = 0) {
    magnetTarget = target;
    magnetStrength = Math.max(0, Math.min(.5, strength));
    positionGhost();
  }

  function matchItemSize(item) {
    if (!ghost || !item?.isConnected) return;
    const rect = item.getBoundingClientRect();
    const offsetRatioX = ghostWidth > 0 ? pointerOffsetX / ghostWidth : .5;
    const offsetRatioY = ghostHeight > 0 ? pointerOffsetY / ghostHeight : .5;
    ghostWidth = rect.width;
    ghostHeight = rect.height;
    pointerOffsetX = rect.width * offsetRatioX;
    pointerOffsetY = rect.height * offsetRatioY;
    ghost.style.setProperty('--sort-ghost-width', `${rect.width}px`);
    ghost.style.setProperty('--sort-ghost-height', `${rect.height}px`);
    positionGhost();
  }

  function start(item, event) {
    source = item;
    const sourceRect = item.getBoundingClientRect();
    ghostWidth = sourceRect.width;
    ghostHeight = sourceRect.height;
    pointerOffsetX = Math.max(0, Math.min(sourceRect.width, event.clientX - sourceRect.left));
    pointerOffsetY = Math.max(0, Math.min(sourceRect.height, event.clientY - sourceRect.top));
    ghost = item.cloneNode(true);
    ghost.removeAttribute('href');
    ghost.removeAttribute('data-id');
    ghost.removeAttribute('data-site-id');
    ghost.removeAttribute('data-group-id');
    ghost.querySelector('.card-link')?.remove();
    ghost.querySelector('.card-actions')?.remove();
    ghost.classList.remove('dragging', 'group-item-dragging', 'reflow-from', 'reflow-to', 'group-reflow-from', 'group-reflow-to', 'group-target', 'reorder-target', 'drop-after');
    ghost.classList.add('sort-drag-ghost');
    ghost.style.setProperty('--sort-ghost-width', `${sourceRect.width}px`);
    ghost.style.setProperty('--sort-ghost-height', `${sourceRect.height}px`);
    lastX = event.clientX;
    pointerX = event.clientX;
    pointerY = event.clientY;
    magnetTarget = null;
    magnetStrength = 0;
    const portal = container.closest('dialog')?.open ? container.closest('dialog') : document.body;
    portal.appendChild(ghost);
    document.body.classList.add('is-dragging-sites');
    source.classList.add('sort-dragging');
    move(event);
  }

  function reflow(beforeRects, draggedItem) {
    items().forEach(item => {
      if (item === draggedItem) return;
      const before = beforeRects.get(item);
      if (!before) return;
      const after = item.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (!dx && !dy) return;

      const previous = reflowStates.get(item);
      if (previous) {
        cancelAnimationFrame(previous.frame);
        clearTimeout(previous.timer);
      }
      item.classList.remove('sort-reflow-to', 'sort-reflow-from');
      item.style.setProperty('--sort-reflow-x', `${dx}px`);
      item.style.setProperty('--sort-reflow-y', `${dy}px`);
      item.classList.add('sort-reflow-from');
      void item.offsetWidth;

      const frame = requestAnimationFrame(() => {
        item.classList.add('sort-reflow-to');
        item.classList.remove('sort-reflow-from');
        const timer = setTimeout(() => {
          item.classList.remove('sort-reflow-to');
          item.style.removeProperty('--sort-reflow-x');
          item.style.removeProperty('--sort-reflow-y');
          reflowStates.delete(item);
        }, 280);
        reflowStates.set(item, { frame, timer });
      });
      reflowStates.set(item, { frame, timer: 0 });
    });
  }

  function finish({ settle = true } = {}) {
    const finishedSource = source;
    const finishedGhost = ghost;
    source = null;
    ghost = null;
    pointerOffsetX = 0;
    pointerOffsetY = 0;
    ghostWidth = 0;
    ghostHeight = 0;
    magnetTarget = null;
    magnetStrength = 0;
    document.body.classList.remove('is-dragging-sites');

    if (!finishedSource || !finishedGhost || !settle) {
      finishedGhost?.remove();
      finishedSource?.classList.remove('sort-dragging');
      return;
    }

    const destination = finishedSource.getBoundingClientRect();
    const finishedRect = finishedGhost.getBoundingClientRect();
    const finalLeft = destination.left + (destination.width - finishedRect.width) / 2;
    const finalTop = destination.top + (destination.height - finishedRect.height) / 2;
    finishedGhost.style.transition = 'left 190ms cubic-bezier(.2,.8,.2,1), top 190ms cubic-bezier(.2,.8,.2,1), transform 190ms cubic-bezier(.2,.8,.2,1), opacity 190ms ease';
    requestAnimationFrame(() => {
      finishedGhost.style.left = `${finalLeft}px`;
      finishedGhost.style.top = `${finalTop}px`;
      finishedGhost.style.setProperty('--sort-ghost-tilt', '0deg');
      finishedGhost.style.transform = 'scale(.94)';
      finishedGhost.style.opacity = '.18';
    });
    setTimeout(() => {
      finishedGhost.remove();
      finishedSource.classList.remove('sort-dragging');
    }, 210);
  }

  function movePortal(portal = document.body) {
    if (ghost) portal.appendChild(ghost);
  }

  return { start, move, setMagnetTarget, matchItemSize, reflow, finish, movePortal, items };
}
