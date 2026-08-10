export function createRotatingText(element, {
  texts = [],
  interval = 2600,
  stagger = 28
} = {}) {
  let items = texts.filter(Boolean);
  let index = 0;
  let timer = null;
  let currentLayer = null;
  let signature = items.join('|');

  element.classList.add('rotating-text');

  const makeLayer = (text, entering = false) => {
    const layer = document.createElement('span');
    layer.className = `rotating-text-layer${entering ? ' is-entering' : ''}`;

    [...text].forEach((character, characterIndex) => {
      const span = document.createElement('span');
      span.className = 'rotating-text-character';
      span.textContent = character;
      span.style.setProperty('--character-delay', `${characterIndex * stagger}ms`);
      layer.append(span);
    });

    return layer;
  };

  const setContainerWidth = layer => {
    const width = Math.ceil(layer.getBoundingClientRect().width || layer.scrollWidth);
    if (width) element.style.width = `${width}px`;
  };

  const renderInitial = () => {
    const text = items[index] || '';
    currentLayer = makeLayer(text);
    element.replaceChildren(currentLayer);
    element.setAttribute('aria-label', text);
    requestAnimationFrame(() => setContainerWidth(currentLayer));
  };

  const rotate = () => {
    if (items.length < 2 || document.hidden) return;

    index = (index + 1) % items.length;
    const nextText = items[index];
    const nextLayer = makeLayer(nextText, true);
    const previousLayer = currentLayer;
    const previousCharacters = [...previousLayer.children];

    previousLayer.setAttribute('aria-hidden', 'true');
    element.append(nextLayer);
    setContainerWidth(nextLayer);
    element.setAttribute('aria-label', nextText);

    previousCharacters.reverse().forEach((character, characterIndex) => {
      character.style.setProperty('--character-delay', `${characterIndex * stagger}ms`);
      character.classList.add('is-exiting');
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => nextLayer.classList.remove('is-entering'));
    });

    currentLayer = nextLayer;
    window.setTimeout(() => previousLayer.remove(), 620 + Math.max(previousCharacters.length, nextText.length) * stagger);
  };

  const restart = () => {
    window.clearInterval(timer);
    if (items.length > 1) timer = window.setInterval(rotate, interval);
  };

  const setTexts = nextTexts => {
    const nextItems = nextTexts.filter(Boolean);
    const nextSignature = nextItems.join('|');
    if (nextSignature === signature) return;
    signature = nextSignature;
    items = nextItems;
    index = 0;
    renderInitial();
    restart();
  };

  renderInitial();
  restart();

  return {
    setTexts,
    destroy() {
      window.clearInterval(timer);
      element.classList.remove('rotating-text');
    }
  };
}
