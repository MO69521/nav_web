import { initAurora } from './aurora.js';
import { createDragSortEffect } from './drag-sort-effect.js';
import { createRotatingText } from './rotating-text.js';
import { createSpecularButton, createSpecularButtonGroup } from './specular-button.js';
import { hydrateRollingNavLabels, rollingNavLabel } from './rolling-nav.js';
import { createApp, h, reactive } from 'vue';
import SplashCursor from './SplashCursor.vue';
import CircularGallery from './CircularGallery.vue';
import LineSidebar from './LineSidebar.vue';
import { AuthError, MissingIdentityError, getUser, handleAuthCallback, login, logout, onAuthChange, signup } from '@netlify/identity';

const baseSites = [
  { id: 'figma', name: 'Figma', url: 'https://www.figma.com', desc: '协作式界面设计工具', category: 'design', color: '#f05b42', icon: 'F' },
  { id: 'pinterest', name: 'Pinterest', url: 'https://www.pinterest.com', desc: '发现与收藏视觉灵感', category: 'design', color: '#df334c', icon: 'P' },
  { id: 'behance', name: 'Behance', url: 'https://www.behance.net', desc: '全球创意作品社区', category: 'design', color: '#4074f7', icon: 'Bē' },
  { id: 'dribbble', name: 'Dribbble', url: 'https://dribbble.com', desc: '设计师作品与趋势', category: 'design', color: '#e85f97', icon: 'D' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', desc: '思考、写作与创造', category: 'ai', color: '#18a47d', icon: '✦' },
  { id: 'midjourney', name: 'Midjourney', url: 'https://www.midjourney.com', desc: 'AI 图像创作社区', category: 'ai', color: '#8a6ef1', icon: 'M' },
  { id: 'notion', name: 'Notion', url: 'https://www.notion.so', desc: '笔记、项目与知识库', category: 'productivity', color: '#24272b', icon: 'N' },
  { id: 'linear', name: 'Linear', url: 'https://linear.app', desc: '高效的产品协作工具', category: 'productivity', color: '#685ee8', icon: 'L' },
  { id: 'readwise', name: 'Readwise', url: 'https://readwise.io', desc: '整理你的阅读高光', category: 'learning', color: '#ff9f43', icon: 'R' },
  { id: 'github', name: 'GitHub', url: 'https://github.com', desc: '代码、项目与开源社区', category: 'development', color: '#3d4652', icon: '⌘' },
  { id: 'codepen', name: 'CodePen', url: 'https://codepen.io', desc: '前端灵感与在线实验', category: 'development', color: '#58c49a', icon: '</>' },
  { id: 'awwwards', name: 'Awwwards', url: 'https://www.awwwards.com', desc: '优秀网页设计案例', category: 'design', color: '#4cb6ad', icon: 'W.' }
];

const builtInCategories = [
  { id: 'all', name: '全部导航', icon: '⌂' },
  { id: 'design', name: '设计灵感', icon: '◈' },
  { id: 'ai', name: 'AI 工具', icon: '✦' },
  { id: 'productivity', name: '效率工具', icon: '⌘' },
  { id: 'learning', name: '学习阅读', icon: '◫' },
  { id: 'development', name: '开发资源', icon: '〈〉' }
];

const engines = [
  { name: 'Google', icon: 'G', domain: 'google.com', url: 'https://www.google.com/search?q=' },
  { name: 'Bing', icon: 'B', domain: 'bing.com', url: 'https://www.bing.com/search?q=' },
  { name: '百度', icon: '百', domain: 'baidu.com', url: 'https://www.baidu.com/s?wd=' },
  { name: '小红书', icon: 'RED', domain: 'xiaohongshu.com', url: 'https://www.xiaohongshu.com/search_result?keyword=' }
];

const otomePlaceholder = index => `/gallery/otome/otome-${String(index).padStart(2, '0')}.png`;
const defaultGalleryItems = [
  { id: 'gallery-1', title: '自然光工作室', board: '空间灵感', image: otomePlaceholder(1), source: '' },
  { id: 'gallery-2', title: '留白与秩序', board: '界面设计', image: otomePlaceholder(2), source: '' },
  { id: 'gallery-3', title: '柔和色彩研究', board: '色彩情绪', image: otomePlaceholder(3), source: '' },
  { id: 'gallery-4', title: '安静的阅读角', board: '空间灵感', image: otomePlaceholder(4), source: '' },
  { id: 'gallery-5', title: '编辑式构图', board: '视觉版式', image: otomePlaceholder(5), source: '' },
  { id: 'gallery-6', title: '日常咖啡记录', board: '生活方式', image: otomePlaceholder(6), source: '' },
  { id: 'gallery-7', title: '克制的产品语言', board: '界面设计', image: otomePlaceholder(7), source: '' },
  { id: 'gallery-8', title: '形体与材质', board: '视觉版式', image: otomePlaceholder(8), source: '' },
  { id: 'gallery-9', title: '远方的蓝色', board: '色彩情绪', image: otomePlaceholder(9), source: '' },
  { id: 'gallery-10', title: '人物与光影', board: '摄影参考', image: otomePlaceholder(10), source: '' }
];

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

let customSites = store.get('mos-custom-sites', []);
let customCategories = store.get('mos-custom-categories', []);
let hiddenBuiltInCategories = new Set(store.get('mos-hidden-built-in-categories', []).filter(id => id !== 'all'));
if (store.get('mos-category-delete-storage-version', 0) < 1) {
  hiddenBuiltInCategories.clear();
  store.set('mos-hidden-built-in-categories', []);
  store.set('mos-category-delete-storage-version', 1);
}
let hiddenSites = new Set(store.get('mos-hidden-sites', []));
let siteOrder = store.get('mos-site-order', []);
let siteGroups = store.get('mos-site-groups', []).map(group => ({ ...group, parentId: group.parentId ?? null }));
let currentCategory = 'all';
let currentEngine = engines[0];
let searchQuery = '';
let activeGroupId = null;
let currentUser = null;
let authMode = 'login';
let galleryItems = store.get('mos-gallery-items', defaultGalleryItems);
if (store.get('mos-gallery-anime-placeholder-version', 0) < 2) {
  const defaultGalleryItemMap = new Map(defaultGalleryItems.map(item => [item.id, item]));
  galleryItems = galleryItems.map(item => {
    const placeholder = defaultGalleryItemMap.get(item.id);
    return placeholder ? { ...item, image: placeholder.image, source: placeholder.source } : item;
  });
  store.set('mos-gallery-items', galleryItems);
  store.set('mos-gallery-anime-placeholder-version', 2);
}
const circularGalleryState = reactive({
  items: galleryItems.map(item => ({ image: item.image, text: item.title }))
});
let circularGallerySignature = galleryItems.map(item => `${item.id}:${item.image}:${item.title}`).join('|');
let currentGalleryMode = 'pins';
let currentGalleryBoard = '全部';
let activeGalleryItemId = null;
const initialNoteTime = Date.now();
const defaultNotes = [{
  id: 'note-welcome',
  title: '欢迎使用笔记',
  content: '<p>这里是你的文档空间。可以记录想法、整理资料，内容会自动保存。</p><p>试试新建一篇笔记吧。</p>',
  createdAt: initialNoteTime,
  updatedAt: initialNoteTime
}];
let notes = store.get('mos-notes', defaultNotes);
if (!Array.isArray(notes) || !notes.length) notes = structuredClone(defaultNotes);
notes = notes.filter(note => note && typeof note === 'object').map((note, index) => ({
  id: String(note.id || `note-recovered-${index}`),
  title: String(note.title || '无标题文档'),
  content: String(note.content || ''),
  createdAt: Number(note.createdAt) || initialNoteTime,
  updatedAt: Number(note.updatedAt) || initialNoteTime,
  sharing: {
    enabled: Boolean(note.sharing?.enabled),
    permission: note.sharing?.permission === 'edit' ? 'edit' : 'view',
    token: String(note.sharing?.token || '')
  }
}));
if (!notes.length) notes = structuredClone(defaultNotes);
let activeNoteId = store.get('mos-active-note-id', notes[0].id);
let currentWorkspaceView = 'bookmarks';
let noteSaveTimer = null;
let savedNoteRange = null;
let savedNoteCaretRange = null;
let noteSelectionPointerActive = false;
let noteMarqueeState = null;
let noteMarqueeBlocks = [];
let activeNoteCallout = null;
let activeNoteTable = null;
let activeNoteTableCell = null;
let pendingNoteTableContext = null;
let noteTablePickerRows = 3;
let noteTablePickerColumns = 3;
let noteTablePickerDragging = false;
let noteColumnResizeState = null;
let noteOutlineCollapsed = Boolean(store.get('mos-note-outline-collapsed', false));
let noteImageDropPlacement = null;
let draggedNoteFigure = null;
let activeNoteBlock = null;
let draggedNoteBlock = null;
let noteBlockDropPlacement = null;
let noteBlockPointerState = null;
let noteBlockHandleHideTimer = null;
let noteImageWasDragged = false;
let noteSlashActiveIndex = 0;
let noteSlashItems = [];
const noteOutlineState = reactive({ items: [], activeIndex: null });
let activeNoteHeading = null;
let noteHeadingToolsHideTimer = null;
let noteOutlineNavigationTarget = null;
let noteOutlineNavigationEndTimer = null;
const trimmedNoteImages = new WeakSet();
const noteEditHistories = new Map();
let restoringNoteHistory = false;
let greetingPeriod = '';
let splashCursorEnabled = store.get('mos-splash-cursor-enabled', true);
let splashCursorApp = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
hydrateRollingNavLabels();
const allSites = () => {
  const sites = [...baseSites, ...customSites].filter(site => !hiddenSites.has(site.id));
  const orderIndex = new Map(siteOrder.map((id, index) => [id, index]));
  return sites.sort((a, b) => (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER));
};

const findGroup = (groupId) => siteGroups.find(group => group.id === groupId);
const childGroups = (groupId) => siteGroups.filter(group => group.parentId === groupId);

function collectGroupSiteIds(groupId, visited = new Set()) {
  if (visited.has(groupId)) return [];
  visited.add(groupId);
  const group = findGroup(groupId);
  if (!group) return [];
  return [...group.siteIds, ...childGroups(groupId).flatMap(child => collectGroupSiteIds(child.id, visited))];
}

function collectGroupIds(groupId, visited = new Set()) {
  if (visited.has(groupId)) return [];
  visited.add(groupId);
  return [groupId, ...childGroups(groupId).flatMap(child => collectGroupIds(child.id, visited))];
}
const allCategories = () => [
  ...builtInCategories.filter(category => category.id === 'all' || !hiddenBuiltInCategories.has(category.id)),
  ...customCategories
];

function escapeHTML(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

const faviconQualityCache = new Map();
const brandVectorSlugs = {
  'figma.com': 'figma',
  'pinterest.com': 'pinterest',
  'behance.net': 'behance',
  'dribbble.com': 'dribbble',
  'chatgpt.com': 'openai',
  'midjourney.com': 'midjourney',
  'notion.so': 'notion',
  'linear.app': 'linear',
  'readwise.io': 'readwise',
  'github.com': 'github',
  'codepen.io': 'codepen',
  'awwwards.com': 'awwwards'
};

function faviconCandidates(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const rootHostname = hostname.replace(/^www\./, '');
    const vectorSlug = brandVectorSlugs[rootHostname];
    const cachedSource = faviconQualityCache.get(hostname)?.source;
    return [...new Set([
      cachedSource,
      `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsed.origin)}&sz=256`,
      vectorSlug ? `https://cdn.simpleicons.org/${encodeURIComponent(vectorSlug)}` : null,
      `${parsed.origin}/favicon.ico`,
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`
    ].filter(Boolean))];
  } catch {
    return [];
  }
}

function faviconImage(site, { loading = true } = {}) {
  const [source, ...fallbackSources] = faviconCandidates(site.url);
  if (!source) return '';
  const hostname = new URL(site.url).hostname;
  return `<img class="site-favicon favicon-checking" src="${escapeHTML(source)}" data-favicon-host="${escapeHTML(hostname)}" data-favicon-sources="${escapeHTML(JSON.stringify(fallbackSources))}" data-favicon-index="0" data-favicon-best="" data-favicon-best-size="0" alt="" ${loading ? 'loading="lazy"' : ''} draggable="false" />`;
}

function siteCard(site) {
  const domain = new URL(site.url).hostname.replace('www.', '');
  return `<article class="site-card" data-id="${site.id}">
    <a class="card-link" href="${escapeHTML(site.url)}" target="_blank" rel="noreferrer" draggable="false" aria-label="打开 ${escapeHTML(site.name)}"></a>
    <div class="site-icon" style="--site-color:${site.color}">${faviconImage(site)}<span class="icon-fallback">${escapeHTML(site.icon)}</span></div>
    <div class="site-info"><h3>${escapeHTML(site.name)}</h3><p>${escapeHTML(site.desc)}</p><span>${domain}</span></div>
    <div class="card-actions">
      <button class="more-btn" data-action="menu" type="button" aria-label="更多操作" aria-expanded="false">•••</button>
      <div class="card-action-menu" role="menu">
        <button class="delete-btn" data-action="delete" type="button" role="menuitem"><span>×</span>移除</button>
      </div>
    </div>
    <span class="open-arrow">↗</span>
  </article>`;
}

function siteGroupCard(group, members) {
  const directMembers = members.length > 4 ? members.slice(0, 3) : members.slice(0, 4);
  const miniIcons = directMembers.map(site => {
    return `<span class="group-mini-icon" style="--site-color:${site.color}">${faviconImage(site)}<span class="icon-fallback">${escapeHTML(site.icon)}</span></span>`;
  }).join('');
  const overflowPreview = members.length > 4
    ? `<span class="group-mini-overflow" aria-hidden="true">${members.slice(3, 7).map(site => `<span class="group-mini-icon" style="--site-color:${site.color}">${faviconImage(site)}<span class="icon-fallback">${escapeHTML(site.icon)}</span></span>`).join('')}</span>`
    : '';
  return `<article class="site-card site-group-card" data-group-id="${group.id}" role="button" tabindex="0" aria-label="打开分组 ${escapeHTML(group.name)}，${members.length} 个网址">
    <div class="group-icon-grid">${miniIcons}${overflowPreview}</div>
    <div class="site-info"><h3>${escapeHTML(group.name)}</h3><span class="group-count">${members.length} 个网址</span></div>
    <div class="card-actions"><button class="delete-btn" data-action="ungroup" aria-label="解散 ${escapeHTML(group.name)}">×</button></div>
  </article>`;
}

function renderGroupedSites(sites) {
  const siteMap = new Map(sites.map(site => [site.id, site]));
  const groupBySite = new Map();
  siteGroups.filter(group => !group.parentId).forEach(group => {
    const members = collectGroupSiteIds(group.id).map(id => siteMap.get(id)).filter(Boolean);
    if (members.length < 2) return;
    members.forEach(site => groupBySite.set(site.id, { group, members }));
  });

  const renderedGroups = new Set();
  return sites.map(site => {
    const grouped = groupBySite.get(site.id);
    if (!grouped) return siteCard(site);
    if (renderedGroups.has(grouped.group.id)) return '';
    renderedGroups.add(grouped.group.id);
    return siteGroupCard(grouped.group, grouped.members);
  }).join('');
}

let destroyCategoryAddSpecular = null;

function renderCategoryTabs() {
  destroyCategoryAddSpecular?.();
  $('#categoryTabs').innerHTML = `${allCategories().map(category => {
    const isCustom = category.custom;
    const isRemovable = category.id !== 'all';
    return `<button class="nav-item rolling-nav-host ${currentCategory === category.id ? 'active' : ''} ${isCustom ? 'custom-tab' : ''} ${isRemovable ? 'removable-tab' : ''}" data-category="${category.id}" aria-label="${escapeHTML(category.name)}">
      ${rollingNavLabel(category.name)}
      ${isRemovable ? `<span class="tab-remove" data-remove-category="${category.id}" title="删除分类" aria-label="删除 ${escapeHTML(category.name)}">×</span>` : ''}
    </button>`;
  }).join('')}<button class="category-add" type="button" data-add-category aria-label="新建分类"><span class="category-add-shell"><span class="add-symbol">＋</span><span>新建分类</span></span></button>`;
  destroyCategoryAddSpecular = createSpecularButton($('.category-add-shell'), { proximity: 250 });
}

function renderCategoryOptions() {
  const options = allCategories().filter(category => category.id !== 'all');
  $('#addForm select[name="category"]').innerHTML = options.map(category => `<option value="${category.id}">${escapeHTML(category.name)}</option>`).join('');
}

function renderSites() {
  const query = searchQuery.trim().toLocaleLowerCase('zh-CN');
  const sites = allSites().filter(site => {
    if (query) {
      const categoryName = allCategories().find(category => category.id === site.category)?.name ?? '';
      return [site.name, site.url, site.desc, categoryName].some(value => value.toLocaleLowerCase('zh-CN').includes(query));
    }
    return currentCategory === 'all' || site.category === currentCategory;
  });
  const groupedView = !query && currentCategory === 'all';
  const siteMarkup = groupedView ? renderGroupedSites(sites) : sites.map(siteCard).join('');
  const addButton = query ? '' : '<button class="add-site-card" type="button" data-action="open-add"><span><i class="add-symbol">＋</i></span><strong>新增网址</strong></button>';
  $('#siteGrid').innerHTML = `${siteMarkup}${addButton}`;
  $('#siteGrid').classList.add('compact-grid');
  $('#emptyState').hidden = sites.length > 0 || !query;
  if (query && sites.length === 0) {
    $('#emptyState h3').textContent = '没有找到匹配的网址';
    $('#emptyState p').textContent = '换个关键词试试，或按 Enter 搜索互联网。';
  }
  renderCategoryTabs();
}

function galleryBoards() {
  return [...new Set(galleryItems.map(item => item.board).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function layoutGalleryMasonry() {
  const grid = $('#galleryGrid');
  if (!grid || grid.hidden || $('#galleryView').hidden) return;
  const style = getComputedStyle(grid);
  const rowHeight = parseFloat(style.gridAutoRows) || 4;
  const rowGap = parseFloat(style.rowGap) || 8;
  $$('#galleryGrid .gallery-pin').forEach(pin => {
    pin.style.gridRowEnd = 'auto';
    const mediaHeight = pin.querySelector('.gallery-pin-media')?.getBoundingClientRect().height || 0;
    const metaHeight = pin.querySelector('.gallery-pin-meta')?.getBoundingClientRect().height || 0;
    const span = Math.max(1, Math.ceil((mediaHeight + metaHeight + rowGap) / (rowHeight + rowGap)));
    pin.style.gridRowEnd = `span ${span}`;
  });
}

function renderGallery() {
  const nextCircularGallerySignature = galleryItems.map(item => `${item.id}:${item.image}:${item.title}`).join('|');
  if (nextCircularGallerySignature !== circularGallerySignature) {
    circularGallerySignature = nextCircularGallerySignature;
    circularGalleryState.items = galleryItems.map(item => ({ image: item.image, text: item.title }));
  }
  const boards = galleryBoards();
  if (currentGalleryBoard !== '全部' && !boards.includes(currentGalleryBoard)) currentGalleryBoard = '全部';
  $('#galleryItemCount').textContent = galleryItems.length;
  $('#galleryBoardCount').textContent = boards.length;
  $('#galleryBoardSuggestions').innerHTML = boards.map(board => `<option value="${escapeHTML(board)}"></option>`).join('');
  $('#galleryBoardFilters').innerHTML = ['全部', ...boards].map(board => `<button class="${board === currentGalleryBoard ? 'active' : ''}" type="button" data-gallery-board-filter="${escapeHTML(board)}">${escapeHTML(board)}</button>`).join('');

  const visibleItems = currentGalleryBoard === '全部' ? galleryItems : galleryItems.filter(item => item.board === currentGalleryBoard);
  $('#galleryGrid').innerHTML = visibleItems.map(item => `<article class="gallery-pin" data-gallery-id="${item.id}">
    <div class="gallery-pin-media">
      <button class="gallery-pin-preview" type="button" data-gallery-preview="${item.id}" aria-label="全屏查看 ${escapeHTML(item.title)}"><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy" draggable="false" /></button>
      <a class="gallery-pin-open" href="${escapeHTML(item.source || item.image)}" target="_blank" rel="noreferrer" aria-label="查看 ${escapeHTML(item.title)}">查看来源</a>
      <button class="gallery-pin-remove" type="button" data-gallery-remove="${item.id}" aria-label="移除 ${escapeHTML(item.title)}">×</button>
    </div>
    <div class="gallery-pin-meta"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.board)}</span></div>
  </article>`).join('');
  $$('#galleryGrid img').forEach(image => {
    if (!image.complete) image.addEventListener('load', layoutGalleryMasonry, { once: true });
  });
  requestAnimationFrame(() => requestAnimationFrame(layoutGalleryMasonry));

  $('#galleryBoards').innerHTML = boards.map(board => {
    const items = galleryItems.filter(item => item.board === board);
    const covers = items.slice(0, 4).map(item => `<img src="${escapeHTML(item.image)}" alt="" loading="lazy" draggable="false" />`).join('');
    return `<button class="gallery-board-card" type="button" data-gallery-board="${escapeHTML(board)}">
      <span class="gallery-board-cover gallery-board-cover-${Math.min(items.length, 4)}">${covers}</span>
      <strong>${escapeHTML(board)}</strong><small>${items.length} 个灵感</small>
    </button>`;
  }).join('');

  const showingBoards = currentGalleryMode === 'boards';
  $('#galleryGrid').hidden = showingBoards;
  $('#galleryBoards').hidden = !showingBoards;
  $('#galleryBoardFilters').hidden = showingBoards;
  $('#galleryEmptyState').hidden = showingBoards ? boards.length > 0 : visibleItems.length > 0;
  $$('.gallery-mode-tabs [data-gallery-mode]').forEach(button => {
    const active = button.dataset.galleryMode === currentGalleryMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function noteById(noteId = activeNoteId) {
  return notes.find(note => note.id === noteId) ?? null;
}

function noteShareToken(note) {
  if (!note.sharing) note.sharing = { enabled: false, permission: 'view', token: '' };
  if (!note.sharing.token) note.sharing.token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return note.sharing.token;
}

function noteShareURL(note) {
  const url = new URL(window.location.href);
  url.hash = `note=${encodeURIComponent(note.id)}&share=${encodeURIComponent(noteShareToken(note))}`;
  return url.toString();
}

function renderNoteSharePanel() {
  const note = noteById();
  if (!note) return;
  if (!note.sharing) note.sharing = { enabled: false, permission: 'view', token: '' };
  const enabled = Boolean(note.sharing.enabled);
  const permission = note.sharing.permission === 'edit' ? 'edit' : 'view';
  $('#noteShareTitle').textContent = `分享“${note.title || '无标题文档'}”`;
  $('#noteShareEnabled').setAttribute('aria-checked', String(enabled));
  $('#noteShareSwitchHint').textContent = enabled ? '已开启，获得链接的人可访问' : '开启后，获得链接的人可访问';
  $('#noteSharePermissionSection').setAttribute('aria-disabled', String(!enabled));
  $('#noteShareLinkSection').setAttribute('aria-disabled', String(!enabled));
  $$('[data-note-permission]').forEach(button => {
    const active = button.dataset.notePermission === permission;
    button.setAttribute('aria-checked', String(active));
  });
  $('#noteShareLink').value = enabled ? noteShareURL(note) : '开启链接分享后生成';
  $('#noteShareSummary').textContent = enabled ? `任何获得链接的人都${permission === 'edit' ? '可以编辑' : '只能查看'}此文档` : '链接分享已关闭';
}

function openNoteSharePanel() {
  saveActiveNote();
  renderNoteSharePanel();
  $('#noteShareBackdrop').hidden = false;
  $('#noteSharePanel').hidden = false;
  requestAnimationFrame(() => document.body.classList.add('note-share-open'));
  $('#closeNoteShare').focus();
}

function closeNoteSharePanel() {
  document.body.classList.remove('note-share-open');
  setTimeout(() => {
    if (document.body.classList.contains('note-share-open')) return;
    $('#noteShareBackdrop').hidden = true;
    $('#noteSharePanel').hidden = true;
  }, 220);
  $('#openNoteShare').focus();
}

function noteNodePath(node, root) {
  const path = [];
  let current = node;
  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) return null;
    path.unshift([...parent.childNodes].indexOf(current));
    current = parent;
  }
  return current === root ? path : null;
}

function noteNodeFromPath(root, path) {
  return path?.reduce((node, index) => node?.childNodes[index], root) || null;
}

function currentNoteHistorySnapshot() {
  const editor = $('#noteEditor');
  const title = $('#noteTitle');
  const selection = window.getSelection();
  const editorSelection = selection?.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)
    ? {
        anchorPath: noteNodePath(selection.anchorNode, editor),
        anchorOffset: selection.anchorOffset,
        focusPath: noteNodePath(selection.focusNode, editor),
        focusOffset: selection.focusOffset
      }
    : null;
  return {
    title: title.value,
    content: sanitizeNoteHTML(editor.innerHTML),
    focus: document.activeElement === title ? 'title' : document.activeElement === editor || editor.contains(document.activeElement) ? 'editor' : '',
    titleSelection: document.activeElement === title ? [title.selectionStart, title.selectionEnd] : null,
    editorSelection
  };
}

function noteSnapshotsMatch(a, b) {
  return Boolean(a && b && a.title === b.title && a.content === b.content);
}

function activeNoteEditHistory() {
  if (!noteEditHistories.has(activeNoteId)) {
    noteEditHistories.set(activeNoteId, { undo: [], redo: [], lastGroup: '', lastCaptureAt: 0 });
  }
  return noteEditHistories.get(activeNoteId);
}

function captureNoteHistory(group = '') {
  if (restoringNoteHistory || !activeNoteId) return;
  const history = activeNoteEditHistory();
  const now = Date.now();
  const canCoalesce = group && history.lastGroup === group && now - history.lastCaptureAt < 900;
  const snapshot = currentNoteHistorySnapshot();
  if (!canCoalesce && !noteSnapshotsMatch(history.undo.at(-1), snapshot)) {
    history.undo.push(snapshot);
    if (history.undo.length > 80) history.undo.shift();
  }
  history.redo = [];
  history.lastGroup = group;
  history.lastCaptureAt = now;
}

function restoreNoteHistorySnapshot(snapshot) {
  if (!snapshot) return;
  restoringNoteHistory = true;
  const editor = $('#noteEditor');
  const title = $('#noteTitle');
  title.value = snapshot.title;
  editor.innerHTML = sanitizeNoteHTML(snapshot.content);
  prepareNoteImages();
  renderNoteOutline();
  closeNoteSlashMenu();
  hideNoteTableTools();
  closeNoteTablePicker();
  $('#noteSelectionBubble').hidden = true;

  if (snapshot.focus === 'title') {
    title.focus({ preventScroll: true });
    if (snapshot.titleSelection) title.setSelectionRange(...snapshot.titleSelection);
  } else {
    editor.focus({ preventScroll: true });
    const saved = snapshot.editorSelection;
    const anchorNode = noteNodeFromPath(editor, saved?.anchorPath);
    const focusNode = noteNodeFromPath(editor, saved?.focusPath);
    if (anchorNode && focusNode) {
      const selection = window.getSelection();
      const anchorOffset = Math.min(saved.anchorOffset, anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.length : anchorNode.childNodes.length);
      const focusOffset = Math.min(saved.focusOffset, focusNode.nodeType === Node.TEXT_NODE ? focusNode.length : focusNode.childNodes.length);
      selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
    } else restoreNoteCaret();
  }
  restoringNoteHistory = false;
  scheduleNoteSave();
}

function stepNoteHistory(direction) {
  const history = activeNoteEditHistory();
  const source = direction === 'undo' ? history.undo : history.redo;
  const destination = direction === 'undo' ? history.redo : history.undo;
  const snapshot = source.pop();
  if (!snapshot) return false;
  const current = currentNoteHistorySnapshot();
  if (!noteSnapshotsMatch(destination.at(-1), current)) destination.push(current);
  history.lastGroup = '';
  history.lastCaptureAt = 0;
  restoreNoteHistorySnapshot(snapshot);
  return true;
}

function sanitizeNoteStyle(styleText = '') {
  if (!styleText || /(?:url\s*\(|expression\s*\(|javascript:|@import|var\s*\()/i.test(styleText)) return '';
  const probe = document.createElement('span');
  probe.style.cssText = styleText;
  const safeRules = [];
  const add = (property, validator = () => true) => {
    const value = probe.style.getPropertyValue(property).trim();
    if (value && validator(value)) safeRules.push(`${property}:${value}`);
  };
  const safeColor = value => CSS.supports('color', value) && !/[<>]/.test(value);
  const safeFontSize = value => {
    const match = value.match(/^(\d+(?:\.\d+)?)(px|pt|em|rem|%)$/i);
    if (!match) return false;
    const number = Number(match[1]);
    return ({ px: [8, 72], pt: [6, 54], em: [.5, 4], rem: [.5, 4], '%': [50, 400] })[match[2].toLowerCase()]?.every((limit, index) => index ? number <= limit : number >= limit);
  };
  const safeSpacing = value => value === 'normal' || /^-?(?:\d+(?:\.\d+)?)(?:px|pt|em|rem)$/.test(value);
  const safeIndent = value => /^(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem))$/.test(value);
  const safeBoxLength = value => /^(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))(?:\s+(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))){0,3}$/.test(value);
  const safeBorderWidth = value => /^(?:thin|medium|thick|0|\d+(?:\.\d+)?(?:px|pt|em|rem))(?:\s+(?:thin|medium|thick|0|\d+(?:\.\d+)?(?:px|pt|em|rem))){0,3}$/.test(value);
  const safeBorderStyle = value => /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)(?:\s+(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)){0,3}$/.test(value);
  add('color', safeColor);
  add('background-color', safeColor);
  add('font-weight', value => /^(?:normal|bold|bolder|lighter|[1-9]00)$/.test(value));
  add('font-style', value => /^(?:normal|italic|oblique(?:\s+-?\d+(?:\.\d+)?deg)?)$/.test(value));
  add('font-size', safeFontSize);
  add('font-family', value => !/[;{}<>]/.test(value));
  add('text-decoration-line', value => /^(?:none|underline|overline|line-through)(?:\s+(?:underline|overline|line-through))*$/.test(value));
  add('text-decoration-style', value => /^(?:solid|double|dotted|dashed|wavy)$/.test(value));
  add('text-decoration-color', safeColor);
  add('text-align', value => /^(?:start|end|left|right|center|justify)$/.test(value));
  add('line-height', value => /^(?:normal|\d+(?:\.\d+)?|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/.test(value));
  add('letter-spacing', safeSpacing);
  add('word-spacing', safeSpacing);
  add('text-indent', safeIndent);
  add('margin-left', safeIndent);
  add('padding-left', safeIndent);
  add('padding-top', safeIndent);
  add('padding-right', safeIndent);
  add('padding-bottom', safeIndent);
  add('padding', safeBoxLength);
  add('margin-top', safeIndent);
  add('margin-right', safeIndent);
  add('margin-bottom', safeIndent);
  add('border-width', safeBorderWidth);
  add('border-top-width', safeBorderWidth);
  add('border-right-width', safeBorderWidth);
  add('border-bottom-width', safeBorderWidth);
  add('border-left-width', safeBorderWidth);
  add('border-style', safeBorderStyle);
  add('border-top-style', safeBorderStyle);
  add('border-right-style', safeBorderStyle);
  add('border-bottom-style', safeBorderStyle);
  add('border-left-style', safeBorderStyle);
  add('border-color', value => value.split(/\s+/).every(safeColor));
  add('border-top-color', safeColor);
  add('border-right-color', safeColor);
  add('border-bottom-color', safeColor);
  add('border-left-color', safeColor);
  add('border-radius', safeBoxLength);
  add('vertical-align', value => /^(?:baseline|sub|super|middle|text-top|text-bottom|top|bottom|-?\d+(?:\.\d+)?(?:px|em|rem|%))$/.test(value));
  add('white-space', value => /^(?:normal|pre|pre-wrap|pre-line|break-spaces)$/.test(value));
  return safeRules.join(';');
}

function normalizeExternalNoteHTML(template) {
  const calloutCandidates = [...template.content.querySelectorAll('aside, section, blockquote, div')].filter(element => {
    const identity = `${element.className || ''} ${element.getAttribute('data-type') || ''} ${element.getAttribute('data-block-type') || ''} ${element.getAttribute('role') || ''}`;
    const style = element.getAttribute('style') || '';
    const semanticCallout = /(?:callout|high[-_ ]?light|admonition|notice|alert|info[-_ ]?box|warning[-_ ]?box)/i.test(identity) || element.hasAttribute('data-callout');
    const visualCallout = /background(?:-color)?\s*:/i.test(style) && /(?:padding|border(?:-radius)?)\s*:/i.test(style);
    return semanticCallout || visualCallout;
  });
  calloutCandidates.forEach(element => {
    if (!element.parentNode) return;
    const callout = element.tagName === 'BLOCKQUOTE' ? element : document.createElement('blockquote');
    if (callout !== element) {
      callout.append(...element.childNodes);
      element.replaceWith(callout);
    }
    const text = callout.textContent.trim();
    const emoji = text.match(/^\p{Extended_Pictographic}\uFE0F?/u)?.[0] || callout.getAttribute('data-emoji') || '💡';
    const firstChild = callout.firstElementChild;
    if (firstChild && firstChild.textContent.trim() === emoji && firstChild.children.length === 0) firstChild.remove();
    callout.classList.add('note-callout');
    callout.dataset.emoji = emoji;
    callout.removeAttribute('style');
  });
  [...template.content.querySelectorAll('.note-callout .note-callout')].reverse().forEach(nestedCallout => {
    nestedCallout.replaceWith(...nestedCallout.childNodes);
  });
  [...template.content.querySelectorAll('blockquote.note-callout')].forEach(callout => {
    [...callout.querySelectorAll('[style]')].forEach(element => {
      element.style.removeProperty('font-size');
      element.style.removeProperty('font-family');
      element.style.removeProperty('line-height');
      element.style.removeProperty('letter-spacing');
      element.style.removeProperty('word-spacing');
    });
  });
  [...template.content.querySelectorAll('font')].forEach(font => {
    const span = document.createElement('span');
    const styles = [];
    if (font.getAttribute('color')) styles.push(`color:${font.getAttribute('color')}`);
    if (font.getAttribute('face')) styles.push(`font-family:${font.getAttribute('face')}`);
    const legacySize = Number(font.getAttribute('size'));
    if (legacySize >= 1 && legacySize <= 7) styles.push(`font-size:${[10, 12, 14, 16, 20, 26, 34][legacySize - 1]}px`);
    span.setAttribute('style', styles.join(';'));
    span.append(...font.childNodes);
    font.replaceWith(span);
  });
  [...template.content.querySelectorAll('center')].forEach(center => {
    const div = document.createElement('div');
    div.style.textAlign = 'center';
    div.append(...center.childNodes);
    center.replaceWith(div);
  });
  [...template.content.querySelectorAll('h6')].forEach(heading => {
    const replacement = document.createElement('h5');
    replacement.innerHTML = heading.innerHTML;
    replacement.setAttribute('style', heading.getAttribute('style') || '');
    heading.replaceWith(replacement);
  });
}

function sanitizeNoteHTML(html = '') {
  const template = document.createElement('template');
  template.innerHTML = String(html);
  template.content.querySelectorAll('#noteTablePicker, .note-table-picker').forEach(picker => picker.remove());
  normalizeExternalNoteHTML(template);
  const allowedTags = new Set(['P', 'BR', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'DEL', 'SUP', 'SUB', 'MARK', 'SMALL', 'BIG', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'UL', 'OL', 'LI', 'DL', 'DT', 'DD', 'BLOCKQUOTE', 'PRE', 'CODE', 'KBD', 'HR', 'FIGURE', 'FIGCAPTION', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
  const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SVG', 'MATH']);
  [...template.content.querySelectorAll('*')].forEach(element => {
    if (!allowedTags.has(element.tagName)) {
      if (blockedTags.has(element.tagName)) element.remove();
      else element.replaceWith(...element.childNodes);
      return;
    }
    let safeStyle = sanitizeNoteStyle(element.getAttribute('style') || '');
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') || '';
      const safeSource = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src) || /^https:\/\//i.test(src);
      [...element.attributes].forEach(attribute => {
        if (!['src', 'alt', 'title', 'width', 'height'].includes(attribute.name)) element.removeAttribute(attribute.name);
      });
      ['width', 'height'].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value && (!/^\d{1,4}$/.test(value) || Number(value) < 1)) element.removeAttribute(attribute);
      });
      if (!safeSource) element.remove();
    } else if (element.tagName === 'DIV' && element.classList.contains('note-image-grid')) {
      const equalColumns = element.dataset.equalColumns === 'true';
      [...element.attributes].forEach(attribute => {
        if (!['class', 'data-equal-columns'].includes(attribute.name)) element.removeAttribute(attribute.name);
      });
      element.className = 'note-image-grid';
      if (equalColumns) element.dataset.equalColumns = 'true';
    } else if (element.tagName === 'TABLE') {
      [...element.attributes].forEach(attribute => element.removeAttribute(attribute.name));
      element.className = 'note-table';
    } else if (['THEAD', 'TBODY', 'TR', 'TH', 'TD'].includes(element.tagName)) {
      [...element.attributes].forEach(attribute => {
        if (!['colspan', 'rowspan'].includes(attribute.name)) element.removeAttribute(attribute.name);
      });
      ['colspan', 'rowspan'].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value && (!/^\d{1,2}$/.test(value) || Number(value) < 1 || Number(value) > 20)) element.removeAttribute(attribute);
      });
    } else if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI', 'BLOCKQUOTE', 'PRE'].includes(element.tagName)) {
      const lineClass = ['note-line-compact', 'note-line-normal', 'note-line-relaxed', 'note-line-loose'].find(className => element.classList.contains(className));
      const isImageAfterline = element.tagName === 'P' && element.classList.contains('note-image-afterline');
      const isCollapsedHeading = /^H[1-5]$/.test(element.tagName) && element.dataset.collapsed === 'true';
      const isCallout = element.tagName === 'BLOCKQUOTE' && element.classList.contains('note-callout');
      const calloutEmoji = isCallout && /^\p{Extended_Pictographic}/u.test(element.dataset.emoji || '') ? element.dataset.emoji : '💡';
      [...element.attributes].forEach(attribute => element.removeAttribute(attribute.name));
      if (lineClass) element.className = lineClass;
      if (isImageAfterline) element.classList.add('note-image-afterline');
      if (isCollapsedHeading) element.dataset.collapsed = 'true';
      if (isCallout) {
        safeStyle = '';
        element.classList.add('note-callout');
        element.dataset.emoji = calloutEmoji;
      }
    } else if (element.tagName === 'A') {
      const rawHref = element.getAttribute('href') || '';
      try {
        const url = new URL(rawHref, window.location.href);
        if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) element.removeAttribute('href');
      } catch {
        element.removeAttribute('href');
      }
      [...element.attributes].forEach(attribute => {
        if (!['href', 'title'].includes(attribute.name)) element.removeAttribute(attribute.name);
      });
      if (element.hasAttribute('href')) {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noreferrer');
      }
    } else if (element.tagName === 'OL') {
      [...element.attributes].forEach(attribute => {
        if (!['start', 'type', 'reversed'].includes(attribute.name)) element.removeAttribute(attribute.name);
      });
    } else if (element.tagName === 'LI') {
      [...element.attributes].forEach(attribute => {
        if (attribute.name !== 'value') element.removeAttribute(attribute.name);
      });
    } else {
      [...element.attributes].forEach(attribute => element.removeAttribute(attribute.name));
    }
    if (safeStyle && element.parentNode) element.setAttribute('style', safeStyle);
  });
  return template.innerHTML;
}

function selectionIsInsideNote(selection = window.getSelection()) {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const editor = $('#noteEditor');
  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer);
}

function rememberNoteCaret() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if ($('#noteEditor').contains(range.commonAncestorContainer)) savedNoteCaretRange = range.cloneRange();
}

function selectedNoteBlock(range) {
  let node = range?.startContainer;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
  return node?.closest?.('h1, h2, h3, h4, h5, p, div, li, blockquote, pre')?.tagName.toLowerCase() || 'p';
}

function positionNoteSelectionBubble() {
  const selection = window.getSelection();
  const bubble = $('#noteSelectionBubble');
  if (currentWorkspaceView !== 'notes' || !selectionIsInsideNote(selection)) {
    bubble.hidden = true;
    return;
  }

  const range = selection.getRangeAt(0);
  savedNoteRange = range.cloneRange();
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    bubble.hidden = true;
    return;
  }

  bubble.hidden = false;
  const bubbleRect = bubble.getBoundingClientRect();
  const left = Math.min(window.innerWidth - bubbleRect.width - 12, Math.max(12, rect.left + rect.width / 2 - bubbleRect.width / 2));
  const top = rect.top - bubbleRect.height - 12 >= 12 ? rect.top - bubbleRect.height - 12 : rect.bottom + 12;
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;

  const block = selectedNoteBlock(range);
  bubble.querySelectorAll('[data-note-command]').forEach(button => {
    const command = button.dataset.noteCommand;
    const isBlock = command === 'formatBlock';
    const active = isBlock
      ? button.dataset.noteValue === block
      : ['bold', 'italic', 'underline', 'strikeThrough'].includes(command) && document.queryCommandState(command);
    button.classList.toggle('active', active);
  });
}

function restoreNoteSelection() {
  if (!savedNoteRange) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedNoteRange);
}

function selectedNoteTextBlocks(range = savedNoteRange) {
  if (!range) return [];
  return $$('#noteEditor p, #noteEditor h1, #noteEditor h2, #noteEditor h3, #noteEditor h4, #noteEditor h5, #noteEditor li, #noteEditor blockquote, #noteEditor pre').filter(block => {
    try { return range.intersectsNode(block); } catch { return false; }
  });
}

function currentNoteLineSpacing() {
  const block = selectedNoteTextBlocks()[0];
  return ['compact', 'normal', 'relaxed', 'loose'].find(value => block?.classList.contains(`note-line-${value}`)) || 'normal';
}

function positionNoteLineSpacingMenu() {
  const menu = $('#noteLineSpacingMenu');
  const button = $('#noteLineSpacingButton');
  menu.hidden = false;
  const buttonRect = button.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const left = Math.min(window.innerWidth - menuRect.width - 12, Math.max(12, buttonRect.left + buttonRect.width / 2 - menuRect.width / 2));
  const top = buttonRect.bottom + menuRect.height + 10 <= window.innerHeight ? buttonRect.bottom + 8 : buttonRect.top - menuRect.height - 8;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  const current = currentNoteLineSpacing();
  menu.querySelectorAll('[data-note-line-spacing]').forEach(option => option.classList.toggle('active', option.dataset.noteLineSpacing === current));
}

function applyNoteLineSpacing(value) {
  captureNoteHistory('');
  restoreNoteSelection();
  const classes = ['note-line-compact', 'note-line-normal', 'note-line-relaxed', 'note-line-loose'];
  selectedNoteTextBlocks().forEach(block => {
    block.classList.remove(...classes);
    block.classList.add(`note-line-${value}`);
  });
  $('#noteLineSpacingMenu').hidden = true;
  $('#noteEditor').focus();
  scheduleNoteSave();
}

function restoreNoteCaret() {
  const editor = $('#noteEditor');
  editor.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  if (savedNoteCaretRange && editor.contains(savedNoteCaretRange.commonAncestorContainer)) {
    selection.addRange(savedNoteCaretRange);
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.addRange(range);
}

function noteDropRangeFromPoint(clientX, clientY, hoveredFigure = null, ignoredFigure = null) {
  const editor = $('#noteEditor');
  let placement = null;
  const sourceBlock = ignoredFigure?.closest('.note-image-grid') || ignoredFigure;
  const actualPointFigure = document.elementFromPoint(clientX, clientY)?.closest?.('#noteEditor figure');
  if (actualPointFigure === ignoredFigure) {
    const rect = ignoredFigure.getBoundingClientRect();
    const range = document.createRange();
    range.selectNode(ignoredFigure);
    range.collapse(clientY < rect.top + rect.height / 2);
    return { range, placement: null, indicatorRect: { left: editor.getBoundingClientRect().left, top: clientY < rect.top + rect.height / 2 ? rect.top : rect.bottom, width: editor.getBoundingClientRect().width, height: 2 } };
  }
  const pointFigure = hoveredFigure || actualPointFigure;
  if (pointFigure) {
    const rect = pointFigure.getBoundingClientRect();
    const sideZone = Math.min(120, rect.width * .3);
    if (clientX <= rect.left + sideZone || clientX >= rect.right - sideZone) {
      const side = clientX < rect.left + rect.width / 2 ? 'column-left' : 'column-right';
      const range = document.createRange();
      range.selectNode(pointFigure);
      range.collapse(side === 'column-left');
      return { range, placement: { target: pointFigure, mode: side }, indicatorRect: { left: side === 'column-left' ? rect.left : rect.right, top: rect.top, width: 2, height: rect.height } };
    }
  }
  let node = null;
  if (document.caretPositionFromPoint) node = document.caretPositionFromPoint(clientX, clientY)?.offsetNode;
  else if (document.caretRangeFromPoint) node = document.caretRangeFromPoint(clientX, clientY)?.startContainer;
  if (!node) node = document.elementFromPoint(clientX, clientY);
  let block = topLevelNoteBlock(node);
  if (block === sourceBlock) block = null;

  const range = document.createRange();
  let indicatorTop;
  if (block) {
    const rect = block.getBoundingClientRect();
    const insertBefore = clientY < rect.top + rect.height / 2;
    range.selectNode(block);
    range.collapse(insertBefore);
    indicatorTop = insertBefore ? rect.top : rect.bottom;
    placement = { target: block, mode: insertBefore ? 'before' : 'after' };
  } else {
    range.selectNodeContents(editor);
    range.collapse(false);
    const lastBlock = [...editor.children].reverse().find(child => child !== sourceBlock);
    indicatorTop = lastBlock ? lastBlock.getBoundingClientRect().bottom : editor.getBoundingClientRect().top + 12;
    placement = lastBlock ? { target: lastBlock, mode: 'after' } : null;
  }
  return { range, placement, indicatorRect: { left: editor.getBoundingClientRect().left, top: indicatorTop, width: editor.getBoundingClientRect().width, height: 2 } };
}

function updateNoteDropIndicator(clientX, clientY, hoveredFigure = null, ignoredFigure = null) {
  const editor = $('#noteEditor');
  const drop = noteDropRangeFromPoint(clientX, clientY, hoveredFigure, ignoredFigure);
  savedNoteCaretRange = drop.range;
  noteImageDropPlacement = drop.placement || null;
  const indicator = $('#noteDropIndicator');
  indicator.hidden = false;
  indicator.classList.toggle('vertical', drop.indicatorRect.height > drop.indicatorRect.width);
  indicator.style.left = `${drop.indicatorRect.left}px`;
  indicator.style.top = `${drop.indicatorRect.top}px`;
  indicator.style.width = `${drop.indicatorRect.width}px`;
  indicator.style.height = `${drop.indicatorRect.height}px`;
}

function hideNoteDropIndicator() {
  $('#noteDropIndicator').hidden = true;
}

function createNoteFigure(source, alt) {
  const template = document.createElement('template');
  template.innerHTML = `<figure><img src="${source}" alt="${escapeHTML(alt)}"><figcaption></figcaption></figure>`;
  return template.content.firstElementChild;
}

function prepareNoteCaption(caption) {
  if (!caption) return;
  if (caption.childNodes.length === 1 && caption.firstElementChild?.tagName === 'BR') caption.innerHTML = '';
  caption.dataset.placeholder = '添加图片注释';
  caption.contentEditable = 'true';
  caption.spellcheck = true;
  caption.setAttribute('role', 'textbox');
  caption.setAttribute('aria-label', '图片注释');
  updateNoteCaptionState(caption);
}

function ensureNoteFigureCaptions() {
  $$('#noteEditor figure').forEach(figure => {
    if (!figure.querySelector(':scope > img')) return;
    const captions = [...figure.querySelectorAll(':scope > figcaption')];
    let caption = captions.find(item => item.textContent.trim()) || captions[0];
    if (!caption) {
      caption = document.createElement('figcaption');
    }
    captions.filter(item => item !== caption).forEach(item => item.remove());
    figure.append(caption);
    prepareNoteCaption(caption);
  });
}

function syncNoteImageGridLayout(grid) {
  if (!grid?.isConnected) return;
  const figures = [...grid.children].filter(child => child.tagName === 'FIGURE' && child.querySelector(':scope > img'));
  if (!figures.length || !grid.clientWidth) return;
  const ratios = figures.map(figure => {
    const image = figure.querySelector(':scope > img');
    return image?.naturalWidth && image?.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
  });
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const availableWidth = Math.max(1, grid.clientWidth - gap * (figures.length - 1));
  const equalColumns = grid.dataset.equalColumns === 'true';
  const rowHeight = equalColumns
    ? Math.min(...ratios.map(ratio => (availableWidth / figures.length) / ratio))
    : availableWidth / ratios.reduce((sum, ratio) => sum + ratio, 0);
  grid.style.setProperty('--note-image-row-height', `${Math.min(680, Math.max(1, rowHeight))}px`);
}

function syncAllNoteImageGridLayouts() {
  $$('#noteEditor .note-image-grid').forEach(syncNoteImageGridLayout);
}

async function trimNoteImageTransparency(image) {
  if (trimmedNoteImages.has(image)) return false;
  trimmedNoteImages.add(image);
  if (!/^data:image\/(png|webp);base64,/i.test(image.src)) return false;
  try {
    if (!image.complete || !image.naturalWidth) await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 8) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) return false;
    const padding = 2;
    left = Math.max(0, left - padding);
    top = Math.max(0, top - padding);
    right = Math.min(canvas.width - 1, right + padding);
    bottom = Math.min(canvas.height - 1, bottom + padding);
    if (left <= 2 && top <= 2 && right >= canvas.width - 3 && bottom >= canvas.height - 3) return false;
    const cropped = document.createElement('canvas');
    cropped.width = right - left + 1;
    cropped.height = bottom - top + 1;
    cropped.getContext('2d').drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    image.src = cropped.toDataURL('image/png');
    return true;
  } catch {
    return false;
  }
}

function prepareNoteImages() {
  ensureNoteFigureCaptions();
  $$('#noteEditor figure img').forEach(image => {
    const updateRatio = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const equalColumns = image.closest('.note-image-grid')?.dataset.equalColumns === 'true';
      const ratio = equalColumns ? 1 : image.naturalWidth / image.naturalHeight;
      image.closest('figure')?.style.setProperty('--note-image-ratio', ratio);
      syncNoteImageGridLayout(image.closest('.note-image-grid'));
    };
    image.draggable = true;
    image.title = '点击放大查看，拖动可调整布局';
    if (image.complete) updateRatio();
    else image.addEventListener('load', updateRatio, { once: true });
    trimNoteImageTransparency(image).then(changed => {
      if (changed) {
        if (image.complete) updateRatio();
        else image.addEventListener('load', updateRatio, { once: true });
        scheduleNoteSave();
      }
    });
  });
  $$('#noteEditor figure figcaption').forEach(prepareNoteCaption);
  $$('#noteEditor .note-image-grid').forEach(grid => {
    const figures = [...grid.children].filter(child => child.tagName === 'FIGURE' && child.querySelector('img'));
    grid.dataset.imageCount = String(figures.length);
    if (grid.dataset.equalColumns === 'true') figures.forEach(figure => figure.style.setProperty('--note-image-ratio', 1));
    syncNoteImageGridLayout(grid);
  });
  ensureWritableLineAfterNoteImages();
}

function updateNoteCaptionState(caption) {
  if (!caption) return;
  const hasCaption = Boolean(caption.textContent.trim());
  caption.dataset.captionEmpty = String(!hasCaption);
  caption.closest('figure')?.classList.toggle('has-caption', hasCaption);
}

function ensureWritableLineAfterNoteImages() {
  const editor = $('#noteEditor');
  const lastBlock = editor.lastElementChild;
  if (lastBlock?.tagName === 'P' && !lastBlock.textContent.trim() && lastBlock.previousElementSibling?.matches('figure, .note-image-grid, table.note-table')) {
    lastBlock.classList.add('note-image-afterline');
    if (!lastBlock.childNodes.length) lastBlock.innerHTML = '<br>';
    return lastBlock;
  }
  if (!lastBlock?.matches('figure, .note-image-grid, table.note-table')) return null;
  const paragraph = document.createElement('p');
  paragraph.innerHTML = '<br>';
  paragraph.className = 'note-image-afterline';
  lastBlock.after(paragraph);
  return paragraph;
}

function focusWritableLineAfterNoteImages(event) {
  if (event.button !== 0 || event.target !== $('#noteEditor')) return false;
  const editor = $('#noteEditor');
  const blocks = [...editor.children];
  const imageIndex = blocks.findLastIndex(block => block.matches('figure, .note-image-grid, table.note-table'));
  if (imageIndex < 0) return false;
  const imageBlock = blocks[imageIndex];
  if (event.clientY <= imageBlock.getBoundingClientRect().bottom) return false;
  const followingBlocks = blocks.slice(imageIndex + 1);
  const onlyEmptyTail = followingBlocks.every(block => block.tagName === 'P' && !block.textContent.trim());
  if (!onlyEmptyTail) return false;
  let paragraph = followingBlocks.find(block => block.classList.contains('note-image-afterline')) || followingBlocks[0];
  if (!paragraph) paragraph = ensureWritableLineAfterNoteImages();
  if (!paragraph) return false;
  paragraph.classList.add('note-image-afterline');
  if (!paragraph.childNodes.length) paragraph.innerHTML = '<br>';
  editor.focus({ preventScroll: true });
  const range = document.createRange();
  if (paragraph.childNodes.length === 1 && paragraph.firstElementChild?.tagName === 'BR') {
    range.setStart(paragraph, 0);
    range.collapse(true);
  } else {
    range.selectNodeContents(paragraph);
    range.collapse(false);
  }
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedNoteCaretRange = range.cloneRange();
  event.preventDefault();
  return true;
}

function noteSelectableBlocks() {
  return $$('#noteEditor > p, #noteEditor > h1, #noteEditor > h2, #noteEditor > h3, #noteEditor > h4, #noteEditor > h5, #noteEditor > ul, #noteEditor > ol, #noteEditor > blockquote, #noteEditor > pre, #noteEditor > hr, #noteEditor > figure, #noteEditor > .note-image-grid, #noteEditor > table.note-table');
}

function topLevelNoteBlock(node) {
  const editor = $('#noteEditor');
  let element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (!element || !editor.contains(element)) return null;
  while (element && element.parentElement !== editor) element = element.parentElement;
  return element && element.parentElement === editor && element.matches('p, h1, h2, h3, h4, h5, ul, ol, blockquote, pre, hr, figure, .note-image-grid, table.note-table') ? element : null;
}

function positionNoteBlockDragHandle(block = activeNoteBlock) {
  const handle = $('#noteBlockDragHandle');
  if (!block?.isConnected || currentWorkspaceView !== 'notes') {
    handle.hidden = true;
    return;
  }
  const rect = block.getBoundingClientRect();
  const documentRect = $('.note-document').getBoundingClientRect();
  handle.hidden = false;
  handle.style.left = `${Math.max(documentRect.left + 8, rect.left - 32)}px`;
  handle.style.top = `${Math.max(documentRect.top + 8, rect.top + Math.min(12, Math.max(0, rect.height / 2 - 14)))}px`;
}

function showNoteBlockDragHandle(block) {
  clearTimeout(noteBlockHandleHideTimer);
  activeNoteBlock = block;
  positionNoteBlockDragHandle(block);
}

function hideNoteBlockDragHandle({ immediate = false } = {}) {
  clearTimeout(noteBlockHandleHideTimer);
  const hide = () => {
    if (draggedNoteBlock) return;
    activeNoteBlock = null;
    $('#noteBlockDragHandle').hidden = true;
  };
  if (immediate) hide();
  else noteBlockHandleHideTimer = setTimeout(hide, 110);
}

function updateNoteBlockDropIndicator(target, clientY) {
  if (!target || target === draggedNoteBlock) {
    noteBlockDropPlacement = null;
    hideNoteDropIndicator();
    return;
  }
  const rect = target.getBoundingClientRect();
  const after = clientY >= rect.top + rect.height / 2;
  const editorRect = $('#noteEditor').getBoundingClientRect();
  noteBlockDropPlacement = { target, after };
  const indicator = $('#noteDropIndicator');
  indicator.hidden = false;
  indicator.classList.remove('vertical');
  indicator.style.left = `${editorRect.left}px`;
  indicator.style.top = `${after ? rect.bottom : rect.top}px`;
  indicator.style.width = `${editorRect.width}px`;
  indicator.style.height = '2px';
}

function nearestNoteBlockForDrop(node, clientY) {
  const directTarget = topLevelNoteBlock(node);
  if (directTarget) return directTarget;
  const blocks = noteSelectableBlocks().filter(block => block !== draggedNoteBlock);
  if (!blocks.length) return null;
  return blocks.reduce((nearest, block) => {
    const distance = Math.abs(block.getBoundingClientRect().top + block.getBoundingClientRect().height / 2 - clientY);
    return !nearest || distance < nearest.distance ? { block, distance } : nearest;
  }, null)?.block || null;
}

function finishNoteBlockDrag() {
  draggedNoteBlock?.classList.remove('dragging-block');
  draggedNoteBlock = null;
  noteBlockDropPlacement = null;
  noteBlockPointerState = null;
  document.body.classList.remove('dragging-note-block');
  hideNoteDropIndicator();
  hideNoteBlockDragHandle({ immediate: true });
}

function commitNoteBlockDrop() {
  const placement = noteBlockDropPlacement;
  if (!draggedNoteBlock || !placement?.target?.isConnected || placement.target === draggedNoteBlock) return false;
  captureNoteHistory('');
  if (placement.after) placement.target.after(draggedNoteBlock);
  else placement.target.before(draggedNoteBlock);
  renderNoteOutline();
  ensureWritableLineAfterNoteImages();
  scheduleNoteSave();
  showToast('内容块顺序已更新');
  return true;
}

function updateNoteBlockPointerDrag(event) {
  if (!noteBlockPointerState || event.pointerId !== noteBlockPointerState.pointerId) return;
  if (!draggedNoteBlock && Math.hypot(event.clientX - noteBlockPointerState.startX, event.clientY - noteBlockPointerState.startY) < 4) return;
  if (!draggedNoteBlock) {
    draggedNoteBlock = noteBlockPointerState.block;
    draggedNoteBlock.classList.add('dragging-block');
    document.body.classList.add('dragging-note-block');
    $('#noteSelectionBubble').hidden = true;
  }
  event.preventDefault();
  const targetNode = document.elementFromPoint(event.clientX, event.clientY);
  updateNoteBlockDropIndicator(nearestNoteBlockForDrop(targetNode, event.clientY), event.clientY);
}

function finishNoteBlockPointerDrag(event) {
  if (!noteBlockPointerState || event.pointerId !== noteBlockPointerState.pointerId) return;
  if (draggedNoteBlock) {
    event.preventDefault();
    commitNoteBlockDrop();
  }
  noteBlockPointerState = null;
  document.body.classList.remove('dragging-note-block');
  finishNoteBlockDrag();
}

function clearNoteMarqueeSelection() {
  noteMarqueeBlocks.forEach(block => block.classList.remove('note-marquee-selected'));
  noteMarqueeBlocks = [];
}

function handleNoteMarqueePointerDown(event) {
  if (event.button !== 0) return;
  if (event.target !== $('#noteEditor')) {
    clearNoteMarqueeSelection();
    return;
  }
  if (!event.shiftKey) clearNoteMarqueeSelection();
  noteMarqueeState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY,
    active: false,
    append: event.shiftKey,
    initialBlocks: event.shiftKey ? [...noteMarqueeBlocks] : []
  };
}

function updateNoteMarqueeSelection(event) {
  if (!noteMarqueeState || event.pointerId !== noteMarqueeState.pointerId) return;
  noteMarqueeState.currentX = event.clientX;
  noteMarqueeState.currentY = event.clientY;
  if (!noteMarqueeState.active && Math.hypot(event.clientX - noteMarqueeState.startX, event.clientY - noteMarqueeState.startY) < 6) return;
  noteMarqueeState.active = true;
  event.preventDefault();
  window.getSelection()?.removeAllRanges();
  $('#noteSelectionBubble').hidden = true;
  closeNoteSlashMenu();
  const left = Math.min(noteMarqueeState.startX, event.clientX);
  const top = Math.min(noteMarqueeState.startY, event.clientY);
  const right = Math.max(noteMarqueeState.startX, event.clientX);
  const bottom = Math.max(noteMarqueeState.startY, event.clientY);
  const box = $('#noteMarqueeBox');
  box.hidden = false;
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${right - left}px`;
  box.style.height = `${bottom - top}px`;
  document.body.classList.add('note-marquee-active');
  const intersecting = noteSelectableBlocks().filter(block => {
    const rect = block.getBoundingClientRect();
    return rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom;
  });
  const nextBlocks = [...new Set([...noteMarqueeState.initialBlocks, ...intersecting])];
  noteMarqueeBlocks.forEach(block => {
    if (!nextBlocks.includes(block)) block.classList.remove('note-marquee-selected');
  });
  nextBlocks.forEach(block => block.classList.add('note-marquee-selected'));
  noteMarqueeBlocks = nextBlocks;
}

function finishNoteMarqueeSelection(event) {
  if (!noteMarqueeState || event.pointerId !== noteMarqueeState.pointerId) return;
  const wasActive = noteMarqueeState.active;
  noteMarqueeState = null;
  $('#noteMarqueeBox').hidden = true;
  document.body.classList.remove('note-marquee-active');
  if (wasActive) {
    event.preventDefault();
    $('#noteEditor').focus({ preventScroll: true });
  } else {
    focusWritableLineAfterNoteImages(event);
  }
}

function deleteNoteMarqueeBlocks() {
  if (!noteMarqueeBlocks.length) return false;
  captureNoteHistory('');
  noteMarqueeBlocks.filter(block => block.isConnected).forEach(block => block.remove());
  clearNoteMarqueeSelection();
  normalizeEditedNoteImageGrids();
  ensureWritableLineAfterNoteImages();
  prepareNoteImages();
  renderNoteOutline();
  scheduleNoteSave();
  showToast('已删除选中内容');
  return true;
}

function normalizeNoteImageGrid(grid) {
  if (!grid?.isConnected) return;
  [...grid.children].filter(child => child.tagName === 'FIGURE' && !child.querySelector('img')).forEach(figure => figure.remove());
  const figures = [...grid.children].filter(child => child.tagName === 'FIGURE' && child.querySelector('img'));
  if (!figures.length) grid.remove();
  else if (figures.length === 1) grid.replaceWith(figures[0]);
}

function normalizeEditedNoteImageGrids() {
  $$('#noteEditor .note-image-grid').forEach(grid => {
    const previousCount = Number(grid.dataset.imageCount) || 0;
    [...grid.children].filter(child => child.tagName === 'FIGURE' && !child.querySelector('img')).forEach(figure => figure.remove());
    const figures = [...grid.children].filter(child => child.tagName === 'FIGURE' && child.querySelector('img'));
    if (previousCount > figures.length && figures.length > 1) grid.dataset.equalColumns = 'true';
    if (grid.dataset.equalColumns === 'true') figures.forEach(figure => figure.style.setProperty('--note-image-ratio', 1));
    grid.dataset.imageCount = String(figures.length);
    normalizeNoteImageGrid(grid);
  });
}

function placeNoteFigure(figure, placement) {
  const target = placement?.target;
  if (!target?.isConnected || target === figure) return false;
  const oldGrid = figure.closest('.note-image-grid');
  if (placement.mode === 'column-left' || placement.mode === 'column-right') {
    let grid = target.closest('.note-image-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'note-image-grid';
      target.replaceWith(grid);
      grid.append(target);
    }
    if (placement.mode === 'column-left') target.before(figure);
    else target.after(figure);
    if (oldGrid && !oldGrid.contains(figure)) normalizeNoteImageGrid(oldGrid);
    return true;
  }
  const targetGrid = target.closest('.note-image-grid');
  const anchor = targetGrid || target;
  if (placement.mode === 'before') anchor.before(figure);
  else anchor.after(figure);
  if (oldGrid && !oldGrid.contains(figure)) normalizeNoteImageGrid(oldGrid);
  return true;
}

function insertNoteImageSource(source, alt, placement = null) {
  captureNoteHistory('');
  if (placement?.target?.isConnected) {
    const figure = createNoteFigure(source, alt);
    placeNoteFigure(figure, placement);
  } else {
    restoreNoteCaret();
    document.execCommand('insertHTML', false, `<figure><img src="${source}" alt="${escapeHTML(alt)}"><figcaption></figcaption></figure><p><br></p>`);
  }
  prepareNoteImages();
  renderNoteOutline();
  scheduleNoteSave();
}

function draggedImageUrl(dataTransfer) {
  const html = dataTransfer.getData('text/html');
  if (html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const source = template.content.querySelector('img')?.getAttribute('src') || '';
    if (/^https:\/\//i.test(source)) return source;
  }
  const uri = dataTransfer.getData('text/uri-list').split('\n').find(value => /^https:\/\//i.test(value.trim()));
  return uri?.trim() || '';
}

function insertNoteImageUrl(url, alt = '拖入的图片', placement = null) {
  if (!/^https:\/\//i.test(url)) {
    showToast('无法识别这张图片');
    return;
  }
  insertNoteImageSource(escapeHTML(url), alt, placement);
  showToast('图片已插入');
}

function openNoteImagePreview(image) {
  const dialog = $('#noteImagePreview');
  const preview = $('#noteImagePreviewSource');
  const caption = image.closest('figure')?.querySelector('figcaption')?.textContent.trim() || '';
  preview.src = image.currentSrc || image.src;
  preview.alt = image.alt || '文档图片';
  preview.classList.remove('zoomed');
  $('#noteImagePreviewCaption').textContent = caption;
  $('#noteImagePreviewCaption').hidden = !caption;
  dialog.classList.remove('zoomed');
  dialog.showModal();
}

function fileToNoteImage(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('请选择图片文件'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('图片解析失败'));
      image.onload = () => {
        const maxEdge = 1600;
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, .86);
        if (dataUrl.length > 2_200_000) {
          reject(new Error('图片过大，请选择更小的图片'));
          return;
        }
        resolve(dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function insertNoteImageFile(file, placement = null) {
  const button = $('#insertNoteImage');
  button.disabled = true;
  button.textContent = '处理中…';
  try {
    const dataUrl = await fileToNoteImage(file);
    const alt = (file.name || '文档图片').replace(/\.[^.]+$/, '');
    insertNoteImageSource(dataUrl, alt, placement);
    showToast('图片已插入');
  } catch (error) {
    showToast(error.message || '图片插入失败');
  } finally {
    button.disabled = false;
    button.textContent = '插入图片';
    $('#noteImageInput').value = '';
  }
}

function runNoteFormatCommand(button, { restoreSelection = false } = {}) {
  if (!button) return;
  if (restoreSelection) restoreNoteSelection();
  const command = button.dataset.noteCommand;
  if (command === 'callout') {
    applyNoteCallout({ restoreSelection });
    return;
  }
  let value = button.dataset.noteValue || null;
  if (command === 'createLink') {
    const enteredUrl = window.prompt('粘贴链接地址');
    if (!enteredUrl) return;
    value = /^(https?:|mailto:)/i.test(enteredUrl) ? enteredUrl : `https://${enteredUrl}`;
    if (restoreSelection) restoreNoteSelection();
  }
  captureNoteHistory('');
  if (command === 'insertHorizontalRule') {
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const insertionRange = selection.getRangeAt(0).cloneRange();
      insertionRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(insertionRange);
    }
    document.execCommand('insertHTML', false, '<hr><p><br></p>');
  } else {
    document.execCommand(command, false, value);
  }
  $('#noteEditor').focus();
  renderNoteOutline();
  scheduleNoteSave();
  requestAnimationFrame(positionNoteSelectionBubble);
}

function applyNoteCallout({ restoreSelection = false } = {}) {
  if (restoreSelection) restoreNoteSelection();
  document.execCommand('formatBlock', false, 'blockquote');
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  selectedNoteTextBlocks(range).filter(block => block.tagName === 'BLOCKQUOTE').forEach(block => {
    block.classList.add('note-callout');
    block.dataset.emoji ||= '💡';
  });
  $('#noteEditor').focus();
  scheduleNoteSave();
  requestAnimationFrame(positionNoteSelectionBubble);
}

function createNoteTable(rows = 3, columns = 3) {
  const table = document.createElement('table');
  table.className = 'note-table';
  const body = table.createTBody();
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = body.insertRow();
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) row.insertCell().innerHTML = '<br>';
  }
  return table;
}

function noteTableCellFromSelection() {
  const selection = window.getSelection();
  let node = selection?.rangeCount ? selection.anchorNode : null;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
  const cell = node?.closest?.('#noteEditor td, #noteEditor th') || null;
  return cell && $('#noteEditor').contains(cell) ? cell : null;
}

function focusNoteTableCell(cell, { end = false } = {}) {
  if (!cell?.isConnected) return;
  $('#noteEditor').focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(!end);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  showNoteTableTools(cell);
}

function focusNoteParagraph(paragraph) {
  if (!paragraph?.isConnected) return;
  $('#noteEditor').focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function ensureNoteTableTail(table) {
  if (table.nextElementSibling?.tagName === 'P') return table.nextElementSibling;
  const tail = document.createElement('p');
  tail.innerHTML = '<br>';
  table.after(tail);
  return tail;
}

function hideNoteTableTools() {
  activeNoteTable?.querySelectorAll('.active-cell').forEach(cell => cell.classList.remove('active-cell'));
  activeNoteTable = null;
  activeNoteTableCell = null;
  $('#noteTableTools').hidden = true;
}

function positionNoteTableTools() {
  const tools = $('#noteTableTools');
  if (!activeNoteTable?.isConnected || currentWorkspaceView !== 'notes') {
    hideNoteTableTools();
    return;
  }
  tools.hidden = false;
  const tableRect = activeNoteTable.getBoundingClientRect();
  const toolsRect = tools.getBoundingClientRect();
  const left = Math.min(window.innerWidth - toolsRect.width - 12, Math.max(12, tableRect.left));
  const top = tableRect.top - toolsRect.height - 8 >= 12 ? tableRect.top - toolsRect.height - 8 : Math.min(window.innerHeight - toolsRect.height - 12, tableRect.top + 8);
  tools.style.left = `${left}px`;
  tools.style.top = `${top}px`;
}

function showNoteTableTools(cell = noteTableCellFromSelection()) {
  const table = cell?.closest?.('table.note-table');
  if (!table) return;
  activeNoteTable?.querySelectorAll('.active-cell').forEach(item => item.classList.remove('active-cell'));
  activeNoteTable = table;
  activeNoteTableCell = cell;
  cell.classList.add('active-cell');
  positionNoteTableTools();
}

function insertNoteTable(context, rows = 3, columns = 3) {
  const table = createNoteTable(rows, columns);
  const tail = document.createElement('p');
  tail.innerHTML = '<br>';
  if (context.block !== $('#noteEditor') && context.block.parentElement === $('#noteEditor') && !context.block.textContent.trim()) {
    context.block.replaceWith(table, tail);
  } else {
    context.range.insertNode(table);
    table.after(tail);
  }
  requestAnimationFrame(() => focusNoteTableCell(table.rows[0]?.cells[0]));
}

function renderNoteTablePickerGrid() {
  const grid = $('#noteTablePickerGrid');
  if (!grid.childElementCount) {
    grid.innerHTML = Array.from({ length: 100 }, (_, index) => {
      const row = Math.floor(index / 10) + 1;
      const column = (index % 10) + 1;
      return `<button class="note-table-picker-cell" type="button" data-table-picker-row="${row}" data-table-picker-column="${column}" aria-label="${row} 行 ${column} 列"></button>`;
    }).join('');
  }
  $$('.note-table-picker-cell').forEach(cell => {
    const selected = Number(cell.dataset.tablePickerRow) <= noteTablePickerRows && Number(cell.dataset.tablePickerColumn) <= noteTablePickerColumns;
    cell.classList.toggle('selected', selected);
  });
  $('#noteTablePickerSize').textContent = `${noteTablePickerRows} × ${noteTablePickerColumns}`;
}

function updateNoteTablePickerSize(cell) {
  if (!cell) return;
  noteTablePickerRows = Number(cell.dataset.tablePickerRow) || 1;
  noteTablePickerColumns = Number(cell.dataset.tablePickerColumn) || 1;
  renderNoteTablePickerGrid();
}

function showNoteTablePicker(context) {
  closeNoteTablePicker();
  const editor = $('#noteEditor');
  const picker = $('#noteTablePicker');
  let topLevelBlock = context.block;
  while (topLevelBlock !== editor && topLevelBlock.parentElement && topLevelBlock.parentElement !== editor) {
    topLevelBlock = topLevelBlock.parentElement;
  }
  const canReplaceEmptyBlock = topLevelBlock !== editor
    && topLevelBlock.parentElement === editor
    && !topLevelBlock.textContent.trim()
    && !topLevelBlock.querySelector('img, figure, table, hr');
  pendingNoteTableContext = {
    range: context.range.cloneRange(),
    block: context.block,
    restoreBlock: canReplaceEmptyBlock ? topLevelBlock : null
  };
  noteTablePickerRows = 3;
  noteTablePickerColumns = 3;
  noteTablePickerDragging = false;
  picker.classList.remove('dragging');
  picker.hidden = false;
  renderNoteTablePickerGrid();
  if (canReplaceEmptyBlock) topLevelBlock.replaceWith(picker);
  else if (topLevelBlock !== editor && topLevelBlock.parentElement === editor) topLevelBlock.after(picker);
  else context.range.insertNode(picker);
  requestAnimationFrame(() => picker.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
}

function closeNoteTablePicker() {
  const context = pendingNoteTableContext;
  const picker = $('#noteTablePicker');
  if (context?.restoreBlock && picker.parentElement === $('#noteEditor')) picker.replaceWith(context.restoreBlock);
  else if (picker.parentElement === $('#noteEditor')) $('.note-document').append(picker);
  pendingNoteTableContext = null;
  noteTablePickerDragging = false;
  picker.classList.remove('dragging');
  picker.hidden = true;
}

function commitNoteTablePicker() {
  const context = pendingNoteTableContext;
  const picker = $('#noteTablePicker');
  if (!context?.range || picker.parentElement !== $('#noteEditor')) return;
  const rows = noteTablePickerRows;
  const columns = noteTablePickerColumns;
  const table = createNoteTable(rows, columns);
  const tail = document.createElement('p');
  tail.innerHTML = '<br>';
  picker.replaceWith(table, tail);
  $('.note-document').append(picker);
  picker.hidden = true;
  picker.classList.remove('dragging');
  pendingNoteTableContext = null;
  noteTablePickerDragging = false;
  requestAnimationFrame(() => focusNoteTableCell(table.rows[0]?.cells[0]));
  renderNoteOutline();
  scheduleNoteSave();
}

function runNoteTableAction(action) {
  const table = activeNoteTable;
  const cell = activeNoteTableCell?.isConnected ? activeNoteTableCell : noteTableCellFromSelection();
  if (!table?.isConnected || !cell) return;
  const row = cell.parentElement;
  const rowIndex = row.rowIndex;
  const columnIndex = cell.cellIndex;
  captureNoteHistory('');
  let nextCell = cell;

  if (action === 'add-row-above' || action === 'add-row-below') {
    const newRow = document.createElement('tr');
    const columnCount = table.rows[0]?.cells.length || 1;
    for (let index = 0; index < columnCount; index += 1) newRow.insertCell().innerHTML = '<br>';
    if (action === 'add-row-above') row.before(newRow);
    else row.after(newRow);
    nextCell = newRow.cells[Math.min(columnIndex, columnCount - 1)];
  } else if (action === 'add-column-left' || action === 'add-column-right') {
    const insertIndex = action === 'add-column-left' ? columnIndex : columnIndex + 1;
    [...table.rows].forEach(currentRow => currentRow.insertCell(Math.min(insertIndex, currentRow.cells.length)).innerHTML = '<br>');
    nextCell = table.rows[rowIndex]?.cells[insertIndex];
  } else if (action === 'delete-row') {
    if (table.rows.length === 1) {
      const tail = ensureNoteTableTail(table);
      table.remove();
      hideNoteTableTools();
      focusNoteParagraph(tail);
      scheduleNoteSave();
      return;
    }
    row.remove();
    const targetRow = table.rows[Math.min(rowIndex, table.rows.length - 1)];
    nextCell = targetRow.cells[Math.min(columnIndex, targetRow.cells.length - 1)];
  } else if (action === 'delete-column') {
    if ((table.rows[0]?.cells.length || 0) === 1) {
      const tail = ensureNoteTableTail(table);
      table.remove();
      hideNoteTableTools();
      focusNoteParagraph(tail);
      scheduleNoteSave();
      return;
    }
    [...table.rows].forEach(currentRow => currentRow.deleteCell(columnIndex));
    nextCell = table.rows[Math.min(rowIndex, table.rows.length - 1)]?.cells[Math.min(columnIndex, table.rows[0].cells.length - 1)];
  } else if (action === 'delete-table') {
    const tail = ensureNoteTableTail(table);
    table.remove();
    hideNoteTableTools();
    focusNoteParagraph(tail);
    scheduleNoteSave();
    return;
  }

  scheduleNoteSave();
  focusNoteTableCell(nextCell);
}

function handleNoteTableTab(event) {
  if (event.key !== 'Tab') return false;
  const cell = noteTableCellFromSelection();
  const table = cell?.closest?.('table.note-table');
  if (!table) return false;
  event.preventDefault();
  let cells = [...table.querySelectorAll('td, th')];
  let nextIndex = cells.indexOf(cell) + (event.shiftKey ? -1 : 1);
  if (nextIndex >= cells.length) {
    captureNoteHistory('');
    const row = table.tBodies[0]?.insertRow() || table.insertRow();
    const columnCount = table.rows[0]?.cells.length || 1;
    for (let index = 0; index < columnCount; index += 1) row.insertCell().innerHTML = '<br>';
    cells = [...table.querySelectorAll('td, th')];
    nextIndex = cells.length - columnCount;
    scheduleNoteSave();
  }
  nextIndex = Math.max(0, Math.min(cells.length - 1, nextIndex));
  focusNoteTableCell(cells[nextIndex]);
  return true;
}

const noteSlashCommands = [
  { id: 'text', group: '基础', icon: 'T', label: '文本', hint: '普通正文', keywords: '正文 text paragraph', command: 'block', value: 'p' },
  { id: 'h1', group: '基础', icon: 'H₁', label: '一级标题', hint: '页面主标题', keywords: 'h1 一级 标题', command: 'block', value: 'h1' },
  { id: 'h2', group: '基础', icon: 'H₂', label: '二级标题', hint: '章节标题', keywords: 'h2 二级 标题', command: 'block', value: 'h2' },
  { id: 'h3', group: '基础', icon: 'H₃', label: '三级标题', hint: '小节标题', keywords: 'h3 三级 标题', command: 'block', value: 'h3' },
  { id: 'h4', group: '基础', icon: 'H₄', label: '四级标题', hint: '更小的标题', keywords: 'h4 四级 标题', command: 'block', value: 'h4' },
  { id: 'h5', group: '基础', icon: 'H₅', label: '五级标题', hint: '最小标题', keywords: 'h5 五级 标题', command: 'block', value: 'h5' },
  { id: 'ordered', group: '列表', icon: '1≡', label: '有序列表', hint: '创建编号列表', keywords: '数字 编号 ordered list', command: 'exec', value: 'insertOrderedList' },
  { id: 'unordered', group: '列表', icon: '•≡', label: '无序列表', hint: '创建项目列表', keywords: '圆点 项目 unordered bullet list', command: 'exec', value: 'insertUnorderedList' },
  { id: 'quote', group: '内容', icon: '“', label: '引用', hint: '突出引用内容', keywords: '引用 quote blockquote', command: 'block', value: 'blockquote' },
  { id: 'code', group: '内容', icon: '{ }', label: '代码块', hint: '等宽代码区域', keywords: '代码 code pre', command: 'block', value: 'pre' },
  { id: 'callout', group: '内容', icon: '💡', label: '高亮块', hint: '强调重点内容，Emoji 可更换', keywords: '高亮 强调 callout emoji', command: 'callout' },
  { id: 'table', group: '内容', icon: '▦', label: '表格', hint: '在文档画布上拖动创建', keywords: '表格 table 行 列 grid', command: 'table' },
  { id: 'divider', group: '内容', icon: '—', label: '分割线', hint: '分隔上下内容', keywords: '分割线 divider separator hr', command: 'html', value: '<hr><p><br></p>' },
  { id: 'image', group: '内容', icon: '▧', label: '图片', hint: '从本地插入图片', keywords: '图片 image photo upload', command: 'image' }
];

function normalizeNoteSlashAfterImage() {
  const editor = $('#noteEditor');
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const caret = selection.getRangeAt(0);
  const textNode = caret.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE || !editor.contains(textNode)) return false;
  const parent = textNode.parentElement;
  const imageBoundary = parent?.closest?.('#noteEditor figure, #noteEditor .note-image-grid');
  if (!imageBoundary) return false;
  const prefix = textNode.data.slice(0, caret.startOffset);
  const match = prefix.match(/\/([^\s/]*)$/);
  if (!match || prefix.slice(0, match.index).trim()) return false;
  const token = match[0];
  textNode.deleteData(match.index, token.length);
  const anchor = imageBoundary.closest('.note-image-grid') || imageBoundary;
  let paragraph = anchor.nextElementSibling;
  if (!paragraph || paragraph.tagName !== 'P' || paragraph.textContent.trim()) {
    paragraph = document.createElement('p');
    anchor.after(paragraph);
  }
  paragraph.textContent = token;
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function noteSlashContext() {
  const editor = $('#noteEditor');
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const caret = selection.getRangeAt(0);
  if (!editor.contains(caret.startContainer)) return null;
  const isDirectRootText = caret.startContainer.nodeType === Node.TEXT_NODE && caret.startContainer.parentNode === editor;
  let node = caret.startContainer.nodeType === Node.TEXT_NODE ? caret.startContainer.parentElement : caret.startContainer;
  if (node?.closest?.('td, th')) return null;
  const block = node?.closest?.('p, h1, h2, h3, h4, h5, li, blockquote, pre, div') || editor;
  if (!editor.contains(block) && block !== editor) return null;
  if (block.closest?.('figure') || block.classList?.contains('note-image-grid')) return null;
  if (isDirectRootText) {
    const prefix = caret.startContainer.data.slice(0, caret.startOffset);
    const match = prefix.match(/\/([^\s/]*)$/);
    if (!match) return null;
    const commandRange = document.createRange();
    commandRange.setStart(caret.startContainer, prefix.length - match[1].length - 1);
    commandRange.setEnd(caret.startContainer, caret.startOffset);
    return { query: match[1], range: commandRange, caret, block: editor };
  }
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(block);
  try { prefixRange.setEnd(caret.endContainer, caret.endOffset); } catch { return null; }
  const prefix = prefixRange.toString();
  const match = prefix.match(/\/([^\s/]*)$/);
  if (!match) return null;
  const slashOffset = prefix.length - match[1].length - 1;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let traversed = 0;
  let startNode = null;
  let startOffset = 0;
  while (walker.nextNode()) {
    const length = walker.currentNode.data.length;
    if (slashOffset <= traversed + length) {
      startNode = walker.currentNode;
      startOffset = Math.max(0, slashOffset - traversed);
      break;
    }
    traversed += length;
  }
  if (!startNode) return null;
  const commandRange = document.createRange();
  commandRange.setStart(startNode, startOffset);
  commandRange.setEnd(caret.endContainer, caret.endOffset);
  return { query: match[1], range: commandRange, caret, block };
}

function closeNoteSlashMenu() {
  $('#noteSlashMenu').hidden = true;
  noteSlashItems = [];
  noteSlashActiveIndex = 0;
}

function positionNoteSlashMenu(context) {
  const menu = $('#noteSlashMenu');
  const rect = context.caret.getBoundingClientRect();
  const fallback = context.block.getBoundingClientRect();
  menu.hidden = false;
  const menuRect = menu.getBoundingClientRect();
  const anchorLeft = rect.left || fallback.left;
  const anchorTop = rect.bottom || fallback.bottom;
  const left = Math.min(window.innerWidth - menuRect.width - 12, Math.max(12, anchorLeft));
  const top = anchorTop + menuRect.height + 10 <= window.innerHeight
    ? anchorTop + 8
    : Math.max(12, (rect.top || fallback.top) - menuRect.height - 8);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function renderNoteSlashMenu() {
  normalizeNoteSlashAfterImage();
  const context = noteSlashContext();
  if (!context) {
    closeNoteSlashMenu();
    return;
  }
  const normalizedQuery = context.query.trim().toLowerCase();
  noteSlashItems = noteSlashCommands.filter(item => !normalizedQuery || `${item.label} ${item.keywords}`.toLowerCase().includes(normalizedQuery));
  noteSlashActiveIndex = Math.min(noteSlashActiveIndex, Math.max(0, noteSlashItems.length - 1));
  $('#noteSlashQuery').textContent = normalizedQuery ? `搜索“${context.query}”` : '快捷插入';
  let group = '';
  $('#noteSlashMenuList').innerHTML = noteSlashItems.length ? noteSlashItems.map((item, index) => {
    const heading = item.group !== group ? `<div class="note-slash-group">${escapeHTML(item.group)}</div>` : '';
    group = item.group;
    return `${heading}<button type="button" role="option" aria-selected="${index === noteSlashActiveIndex}" class="note-slash-item ${index === noteSlashActiveIndex ? 'active' : ''}" data-note-slash-index="${index}"><span class="note-slash-icon">${escapeHTML(item.icon)}</span><span><strong>${escapeHTML(item.label)}</strong><small>${escapeHTML(item.hint)}</small></span><kbd>↵</kbd></button>`;
  }).join('') : '<p class="note-slash-empty">没有匹配的命令</p>';
  positionNoteSlashMenu(context);
  $('#noteSlashMenuList .active')?.scrollIntoView({ block: 'nearest' });
}

function executeNoteSlashCommand(item) {
  const context = noteSlashContext();
  if (!item || !context) return;
  captureNoteHistory('');
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(context.range);
  context.range.deleteContents();
  context.range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(context.range);
  closeNoteSlashMenu();
  if (item.command === 'block' && context.block === $('#noteEditor')) {
    const block = document.createElement(item.value);
    block.innerHTML = '<br>';
    context.range.insertNode(block);
    const caret = document.createRange();
    caret.selectNodeContents(block);
    caret.collapse(false);
    selection.removeAllRanges();
    selection.addRange(caret);
  } else if (item.command === 'block') document.execCommand('formatBlock', false, item.value);
  else if (item.command === 'callout') {
    document.execCommand('insertHTML', false, '<blockquote class="note-callout" data-emoji="💡"><br></blockquote><p><br></p>');
  }
  else if (item.command === 'exec') document.execCommand(item.value, false, null);
  else if (item.command === 'html') document.execCommand('insertHTML', false, item.value);
  else if (item.command === 'table') {
    showNoteTablePicker(context);
    renderNoteOutline();
    return;
  }
  else if (item.command === 'image') {
    savedNoteCaretRange = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0).cloneRange() : null;
    $('#noteImageInput').click();
  }
  $('#noteEditor').focus();
  renderNoteOutline();
  scheduleNoteSave();
}

function notePlainText(html = '') {
  const container = document.createElement('div');
  container.innerHTML = sanitizeNoteHTML(html);
  return (container.textContent || '').replace(/\s+/g, ' ').trim();
}

function formatNoteTime(timestamp) {
  const date = new Date(timestamp || Date.now());
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function persistNotes() {
  try {
    store.set('mos-notes', notes);
    store.set('mos-active-note-id', activeNoteId);
    return true;
  } catch {
    showToast('存储空间不足，请删除部分图片后重试');
    return false;
  }
}

function renderNoteList() {
  $('#notesList').innerHTML = [...notes]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map(note => {
      const excerpt = notePlainText(note.content) || '空白文档';
      const title = note.title || '无标题文档';
      return `<div class="note-list-row"><button class="note-list-item ${note.id === activeNoteId ? 'active' : ''}" type="button" role="option" aria-selected="${note.id === activeNoteId}" data-note-id="${escapeHTML(note.id)}"><strong>${escapeHTML(title)}</strong><p>${escapeHTML(excerpt)}</p><span>${formatNoteTime(note.updatedAt)}</span></button><button class="note-list-delete" type="button" data-note-delete-id="${escapeHTML(note.id)}" aria-label="删除${escapeHTML(title)}" title="删除笔记">×</button></div>`;
    }).join('');
}

function noteHeadings() {
  return $$('#noteEditor h1, #noteEditor h2, #noteEditor h3, #noteEditor h4, #noteEditor h5');
}

function orderedListOrdinal(list, targetItem) {
  const items = [...list.children].filter(child => child.tagName === 'LI');
  const reversed = list.hasAttribute('reversed');
  const explicitStart = Number(list.getAttribute('start'));
  let ordinal = Number.isFinite(explicitStart) && explicitStart !== 0 ? explicitStart : reversed ? items.length : 1;
  for (const item of items) {
    const explicitValue = Number(item.getAttribute('value'));
    if (Number.isFinite(explicitValue) && explicitValue !== 0) ordinal = explicitValue;
    if (item === targetItem) return ordinal;
    ordinal += reversed ? -1 : 1;
  }
  return null;
}

function alphabeticOrdinal(value, uppercase = false) {
  let number = Math.max(1, Math.abs(value));
  let result = '';
  while (number > 0) {
    number -= 1;
    result = String.fromCharCode((uppercase ? 65 : 97) + number % 26) + result;
    number = Math.floor(number / 26);
  }
  return result;
}

function romanOrdinal(value, uppercase = false) {
  let number = Math.max(1, Math.min(3999, Math.abs(value)));
  const numerals = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
  let result = '';
  numerals.forEach(([symbol, amount]) => {
    while (number >= amount) {
      result += symbol;
      number -= amount;
    }
  });
  return uppercase ? result : result.toLowerCase();
}

function orderedListPrefixForHeading(heading) {
  const item = heading.closest('li');
  const list = item?.parentElement;
  if (!item || list?.tagName !== 'OL') return '';
  const ordinal = orderedListOrdinal(list, item);
  if (ordinal === null) return '';
  const type = list.getAttribute('type') || '1';
  const value = type === 'a' ? alphabeticOrdinal(ordinal) : type === 'A' ? alphabeticOrdinal(ordinal, true) : type === 'i' ? romanOrdinal(ordinal) : type === 'I' ? romanOrdinal(ordinal, true) : String(ordinal);
  return `${value}.`;
}

function noteOutlineHeadingLabel(heading, index) {
  const label = heading.textContent.trim() || `未命名标题 ${index + 1}`;
  const prefix = orderedListPrefixForHeading(heading);
  if (!prefix) return label;
  const normalizedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${normalizedPrefix}(?:\\s|$)`).test(label) ? label : `${prefix} ${label}`;
}

function renderNoteOutline() {
  applyNoteHeadingCollapses();
  const headings = noteHeadings();
  if (!headings.length) {
    noteOutlineState.items = [];
    noteOutlineState.activeIndex = null;
    return;
  }
  let collapsedAncestorLevel = null;
  noteOutlineState.items = headings.flatMap((heading, index) => {
    const level = noteHeadingLevel(heading);
    if (collapsedAncestorLevel !== null && level <= collapsedAncestorLevel) collapsedAncestorLevel = null;
    const hiddenByAncestor = collapsedAncestorLevel !== null && level > collapsedAncestorLevel;
    const nextLevel = noteHeadingLevel(headings[index + 1]);
    const hasChildren = index < headings.length - 1 && nextLevel > level;
    const collapsed = heading.dataset.collapsed === 'true';
    if (!hiddenByAncestor && collapsed && hasChildren) collapsedAncestorLevel = level;
    if (hiddenByAncestor) return [];
    const label = noteOutlineHeadingLabel(heading, index);
    return [{ label, level, hasChildren, collapsed, outlineIndex: index }];
  });
  updateActiveNoteOutline();
}

function noteHeadingLevel(heading) {
  return Number(heading?.tagName?.slice(1)) || 1;
}

function applyNoteHeadingCollapses() {
  const editor = $('#noteEditor');
  $$('#noteEditor .note-section-hidden').forEach(element => element.classList.remove('note-section-hidden'));
  noteHeadings().filter(heading => heading.dataset.collapsed === 'true').forEach(heading => {
    const level = noteHeadingLevel(heading);
    let sibling = heading.nextElementSibling;
    while (sibling && (!/^H[1-5]$/.test(sibling.tagName) || noteHeadingLevel(sibling) > level)) {
      sibling.classList.add('note-section-hidden');
      sibling = sibling.nextElementSibling;
    }
  });
}

function hideNoteHeadingTools({ immediate = false } = {}) {
  clearTimeout(noteHeadingToolsHideTimer);
  const hide = () => {
    $('#noteHeadingTools').hidden = true;
    $('#noteHeadingLevelMenu').hidden = true;
    $('#noteHeadingLevel').setAttribute('aria-expanded', 'false');
    activeNoteHeading = null;
  };
  if (immediate) hide();
  else noteHeadingToolsHideTimer = setTimeout(hide, 120);
}

function positionNoteHeadingTools() {
  const tools = $('#noteHeadingTools');
  if (!activeNoteHeading?.isConnected || activeNoteHeading.classList.contains('note-section-hidden')) {
    hideNoteHeadingTools({ immediate: true });
    return;
  }
  tools.hidden = false;
  const headingRect = activeNoteHeading.getBoundingClientRect();
  const toolsRect = tools.getBoundingClientRect();
  const left = Math.max(10, headingRect.left - toolsRect.width - 10);
  const top = Math.max(10, headingRect.top + Math.min(4, Math.max(0, (headingRect.height - toolsRect.height) / 2)));
  tools.style.left = `${left}px`;
  tools.style.top = `${top}px`;
  $('#noteHeadingLevel').textContent = activeNoteHeading.tagName;
  const collapsed = activeNoteHeading.dataset.collapsed === 'true';
  $('#noteHeadingCollapse').classList.toggle('collapsed', collapsed);
  $('#noteHeadingCollapse').title = collapsed ? '展开标题内容' : '折叠标题内容';
  $('#noteHeadingCollapse').setAttribute('aria-label', collapsed ? '展开标题内容' : '折叠标题内容');
  $$('#noteHeadingLevelMenu [data-note-heading-level]').forEach(button => button.classList.toggle('active', button.dataset.noteHeadingLevel === activeNoteHeading.tagName.toLowerCase()));
}

function showNoteHeadingTools(heading) {
  if (!heading) return;
  clearTimeout(noteHeadingToolsHideTimer);
  activeNoteHeading = heading;
  positionNoteHeadingTools();
}

function changeActiveNoteHeadingLevel(level) {
  if (!activeNoteHeading?.isConnected || !/^h[1-5]$/.test(level)) return;
  captureNoteHistory('');
  const replacement = document.createElement(level);
  replacement.innerHTML = activeNoteHeading.innerHTML || '<br>';
  replacement.className = activeNoteHeading.className;
  if (activeNoteHeading.dataset.collapsed === 'true') replacement.dataset.collapsed = 'true';
  activeNoteHeading.replaceWith(replacement);
  activeNoteHeading = replacement;
  $('#noteHeadingLevelMenu').hidden = true;
  $('#noteHeadingLevel').setAttribute('aria-expanded', 'false');
  renderNoteOutline();
  positionNoteHeadingTools();
  scheduleNoteSave();
}

function toggleActiveNoteHeadingCollapse() {
  if (!activeNoteHeading?.isConnected) return;
  captureNoteHistory('');
  if (activeNoteHeading.dataset.collapsed === 'true') delete activeNoteHeading.dataset.collapsed;
  else activeNoteHeading.dataset.collapsed = 'true';
  applyNoteHeadingCollapses();
  renderNoteOutline();
  positionNoteHeadingTools();
  scheduleNoteSave();
}

function updateActiveNoteOutline() {
  const allHeadings = noteHeadings();
  const visibleHeadings = allHeadings.filter(heading => !heading.classList.contains('note-section-hidden') && heading.getClientRects().length > 0);
  if (!visibleHeadings.length) {
    noteOutlineState.activeIndex = null;
    return;
  }
  if (noteOutlineNavigationTarget !== null) {
    const targetIndex = noteOutlineState.items.findIndex(item => item.outlineIndex === noteOutlineNavigationTarget);
    if (targetIndex >= 0) noteOutlineState.activeIndex = targetIndex;
    return;
  }
  const documentTop = $('.note-document').getBoundingClientRect().top;
  let activeHeadingIndex = allHeadings.indexOf(visibleHeadings[0]);
  visibleHeadings.forEach(heading => {
    if (heading.getBoundingClientRect().top <= documentTop + 150) activeHeadingIndex = allHeadings.indexOf(heading);
  });
  let visibleIndex = 0;
  noteOutlineState.items.forEach((item, index) => {
    if (item.outlineIndex <= activeHeadingIndex) visibleIndex = index;
  });
  noteOutlineState.activeIndex = visibleIndex;
}

function finishNoteOutlineNavigation() {
  clearTimeout(noteOutlineNavigationEndTimer);
  noteOutlineNavigationEndTimer = null;
  noteOutlineNavigationTarget = null;
  updateActiveNoteOutline();
}

function scheduleNoteOutlineNavigationEnd(delay = 180) {
  clearTimeout(noteOutlineNavigationEndTimer);
  noteOutlineNavigationEndTimer = setTimeout(finishNoteOutlineNavigation, delay);
}

function activateNoteOutlineItem(item) {
  const heading = noteHeadings()[item?.outlineIndex];
  if (!heading) return;
  const documentScroller = $('.note-document');
  const scrollerRect = documentScroller.getBoundingClientRect();
  const headingRect = heading.getBoundingClientRect();
  const desiredTop = documentScroller.scrollTop + headingRect.top - scrollerRect.top - 24;
  const targetTop = Math.max(0, Math.min(desiredTop, documentScroller.scrollHeight - documentScroller.clientHeight));
  if (Math.abs(targetTop - documentScroller.scrollTop) < 2) {
    noteOutlineNavigationTarget = null;
    updateActiveNoteOutline();
    return;
  }
  noteOutlineNavigationTarget = item.outlineIndex;
  const targetIndex = noteOutlineState.items.findIndex(outlineItem => outlineItem.outlineIndex === item.outlineIndex);
  if (targetIndex >= 0) noteOutlineState.activeIndex = targetIndex;
  documentScroller.scrollTo({
    top: targetTop,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  });
  scheduleNoteOutlineNavigationEnd(900);
}

function toggleNoteOutlineItem(item) {
  const heading = noteHeadings()[item?.outlineIndex];
  if (!heading) return;
  captureNoteHistory('');
  if (heading.dataset.collapsed === 'true') delete heading.dataset.collapsed;
  else heading.dataset.collapsed = 'true';
  renderNoteOutline();
  scheduleNoteSave();
}

function loadActiveNote({ focusTitle = false } = {}) {
  if (!noteById()) activeNoteId = notes[0]?.id ?? null;
  const note = noteById();
  if (!note) return;
  clearTimeout(noteOutlineNavigationEndTimer);
  noteOutlineNavigationEndTimer = null;
  noteOutlineNavigationTarget = null;
  savedNoteRange = null;
  savedNoteCaretRange = null;
  clearNoteMarqueeSelection();
  noteMarqueeState = null;
  $('#noteMarqueeBox').hidden = true;
  document.body.classList.remove('note-marquee-active');
  activeNoteCallout = null;
  $('#noteCalloutEmojiMenu').hidden = true;
  hideNoteTableTools();
  closeNoteTablePicker();
  finishNoteBlockDrag();
  closeNoteSlashMenu();
  hideNoteHeadingTools({ immediate: true });
  $('#noteSelectionBubble').hidden = true;
  $('#noteTitle').value = note.title || '';
  $('#noteEditor').innerHTML = sanitizeNoteHTML(note.content);
  prepareNoteImages();
  $('.note-document').scrollTop = 0;
  renderNoteOutline();
  if (noteOutlineState.items.length) noteOutlineState.activeIndex = 0;
  $('#noteSaveStatus').textContent = '已保存';
  $('#noteSaveStatus').classList.remove('saving');
  renderNoteList();
  if (!$('#noteSharePanel').hidden) renderNoteSharePanel();
  if (focusTitle) {
    $('#noteTitle').focus();
    $('#noteTitle').select();
  }
}

function saveActiveNote() {
  clearTimeout(noteSaveTimer);
  noteSaveTimer = null;
  const note = noteById();
  if (!note) return;
  note.title = $('#noteTitle').value.trim() || '无标题文档';
  note.content = sanitizeNoteHTML($('#noteEditor').innerHTML);
  note.updatedAt = Date.now();
  if (!persistNotes()) {
    $('#noteSaveStatus').textContent = '保存失败';
    $('#noteSaveStatus').classList.remove('saving');
    return;
  }
  renderNoteList();
  $('#noteSaveStatus').textContent = '已保存';
  $('#noteSaveStatus').classList.remove('saving');
}

function scheduleNoteSave() {
  clearTimeout(noteSaveTimer);
  $('#noteSaveStatus').textContent = '保存中…';
  $('#noteSaveStatus').classList.add('saving');
  noteSaveTimer = setTimeout(saveActiveNote, 320);
}

function createNote() {
  saveActiveNote();
  const now = Date.now();
  const note = { id: `note-${now}-${Math.random().toString(36).slice(2, 7)}`, title: '无标题文档', content: '', createdAt: now, updatedAt: now, sharing: { enabled: false, permission: 'view', token: '' } };
  notes.unshift(note);
  activeNoteId = note.id;
  persistNotes();
  loadActiveNote({ focusTitle: true });
}

function deleteNoteById(noteId) {
  const index = notes.findIndex(note => note.id === noteId);
  if (index < 0) return;
  const previousActiveNoteId = activeNoteId;
  const [removedNote] = notes.splice(index, 1);
  const removedActiveNote = noteId === activeNoteId;
  if (!notes.length) {
    const now = Date.now();
    notes.push({ id: `note-${now}-${Math.random().toString(36).slice(2, 7)}`, title: '无标题文档', content: '', createdAt: now, updatedAt: now });
  }
  if (removedActiveNote) activeNoteId = notes[Math.min(index, notes.length - 1)].id;
  persistNotes();
  if (removedActiveNote) loadActiveNote();
  else renderNoteList();
  showToast('笔记已删除', {
    duration: 6000,
    actionLabel: '撤销',
    onAction: () => {
      notes.splice(Math.min(index, notes.length), 0, removedNote);
      activeNoteId = removedActiveNote ? removedNote.id : previousActiveNoteId;
      persistNotes();
      loadActiveNote();
      showToast('已撤销删除');
    }
  });
}

function deleteActiveNote() {
  deleteNoteById(activeNoteId);
}

function renderEngines() {
  $('#engineMenu').innerHTML = engines.map(engine => `<button type="button" data-engine="${engine.name}"><span class="engine-option-icon">${engineLogo(engine)}</span>${engine.name}</button>`).join('');
  renderCurrentEngine();
}

function engineLogo(engine) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(engine.domain)}&sz=64`;
  return `<img src="${src}" alt="" /><i>${escapeHTML(engine.icon)}</i>`;
}

function renderCurrentEngine() {
  $('#engineIcon').classList.remove('fallback');
  $('#engineIcon').innerHTML = engineLogo(currentEngine);
  $('#engineName').textContent = currentEngine.name;
}

function persistGroups() {
  store.set('mos-site-groups', siteGroups);
}

function uniqueGroupName(baseName = '新分组') {
  let name = baseName;
  let suffix = 2;
  while (siteGroups.some(group => group.name === name)) name = `${baseName} ${suffix++}`;
  return name;
}

function createParentGroup(sourceGroup, targetGroup = null, targetSiteId = null) {
  if (!sourceGroup || (targetGroup && sourceGroup.id === targetGroup.id)) return false;
  const parentId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const parent = {
    id: parentId,
    name: uniqueGroupName('新分组'),
    siteIds: targetSiteId ? [targetSiteId] : [],
    parentId: null
  };
  sourceGroup.parentId = parentId;
  if (targetGroup) targetGroup.parentId = parentId;
  siteGroups.push(parent);
  persistGroups();
  return 'nested-created';
}

function createOrExtendGroup(sourceCard, targetCard) {
  const sourceId = sourceCard.dataset.id;
  const sourceGroup = findGroup(sourceCard.dataset.groupId);
  const targetId = targetCard.dataset.id;
  const targetGroup = findGroup(targetCard.dataset.groupId);

  if (sourceGroup) {
    if (targetGroup) return createParentGroup(sourceGroup, targetGroup);
    if (targetId) return createParentGroup(sourceGroup, null, targetId);
    return false;
  }

  if (!sourceId) return false;
  if (targetGroup) {
    if (collectGroupSiteIds(targetGroup.id).includes(sourceId)) return false;
    targetGroup.siteIds.push(sourceId);
    persistGroups();
    return 'extended';
  }

  if (!targetId || targetId === sourceId) return false;
  const source = allSites().find(site => site.id === sourceId);
  const target = allSites().find(site => site.id === targetId);
  if (!source || !target) return false;
  const sharedCategory = source.category === target.category
    ? allCategories().find(category => category.id === source.category)?.name
    : null;
  const baseName = sharedCategory ? `${sharedCategory}分组` : '新分组';
  siteGroups.push({
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: uniqueGroupName(baseName),
    siteIds: [targetId, sourceId],
    parentId: null
  });
  persistGroups();
  return 'created';
}

function setGroupDialogOrigin(sourceElement) {
  const content = $('.group-dialog-content');
  const sourceRect = sourceElement?.getBoundingClientRect();
  if (!sourceRect || !content) {
    groupDialog.style.setProperty('--group-origin-x', '0px');
    groupDialog.style.setProperty('--group-origin-y', '18px');
    groupDialog.style.setProperty('--group-origin-scale', '.82');
    return;
  }

  const contentRect = content.getBoundingClientRect();
  const sourceX = sourceRect.left + sourceRect.width / 2;
  const sourceY = sourceRect.top + sourceRect.height / 2;
  const contentX = contentRect.left + contentRect.width / 2;
  const contentY = contentRect.top + contentRect.height / 2;
  const scale = Math.max(.16, Math.min(.42, sourceRect.width / contentRect.width));
  groupDialog.style.setProperty('--group-origin-x', `${sourceX - contentX}px`);
  groupDialog.style.setProperty('--group-origin-y', `${sourceY - contentY}px`);
  groupDialog.style.setProperty('--group-origin-scale', scale.toFixed(3));
}

function playGroupDialogOpen(sourceElement) {
  const content = $('.group-dialog-content');
  groupDialog.classList.remove('is-closing', 'is-opening');
  setGroupDialogOrigin(sourceElement);
  // Restart the animation even when navigating rapidly between groups.
  void groupDialog.offsetWidth;
  groupDialog.classList.add('is-opening');
  const handleOpenEnd = event => {
    if (event.target !== content) return;
    content.removeEventListener('animationend', handleOpenEnd);
    groupDialog.classList.remove('is-opening');
  };
  content.addEventListener('animationend', handleOpenEnd);
}

function playNestedGroupOpen(sourceRect, previousLayer) {
  if (!sourceRect || !previousLayer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    previousLayer?.remove();
    return;
  }
  const content = $('.group-dialog-content');
  const destinationRect = content?.getBoundingClientRect();
  if (!destinationRect?.width || !destinationRect.height) {
    previousLayer.remove();
    return;
  }
  const sourceX = sourceRect.left + sourceRect.width / 2;
  const sourceY = sourceRect.top + sourceRect.height / 2;
  const originX = sourceX - destinationRect.left;
  const originY = sourceY - destinationRect.top;
  content.style.setProperty('--group-level-origin-x', `${originX}px`);
  content.style.setProperty('--group-level-origin-y', `${originY}px`);
  previousLayer.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  previousLayer.setAttribute('aria-hidden', 'true');
  previousLayer.classList.add('group-level-previous-layer');
  Object.assign(previousLayer.style, {
    left: `${destinationRect.left}px`,
    top: `${destinationRect.top}px`,
    width: `${destinationRect.width}px`,
    height: `${destinationRect.height}px`,
    transformOrigin: `${originX}px ${originY}px`
  });
  groupDialog.append(previousLayer);
  groupDialog.classList.remove('is-level-zooming-in');
  void groupDialog.offsetWidth;
  groupDialog.classList.add('is-level-zooming-in');
  const previousAnimation = previousLayer.animate([
    { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' },
    { opacity: .72, offset: .58, filter: 'blur(.5px)', transform: 'scale(1.035)' },
    { opacity: 0, filter: 'blur(4px)', transform: 'scale(1.085)' }
  ], {
    duration: 500,
    easing: 'cubic-bezier(.22,.72,.18,1)',
    fill: 'forwards'
  });
  const finish = () => {
    groupDialog.classList.remove('is-level-zooming-in');
    content.style.removeProperty('--group-level-origin-x');
    content.style.removeProperty('--group-level-origin-y');
    previousLayer.remove();
  };
  const handleZoomEnd = event => {
    if (event.target !== content) return;
    content.removeEventListener('animationend', handleZoomEnd);
    finish();
  };
  content.addEventListener('animationend', handleZoomEnd);
  previousAnimation.finished.catch(() => {}).finally(() => previousLayer.remove());
}

function playNestedGroupClose(parentId, childId) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    openGroupDialog(parentId);
    return;
  }
  const content = $('.group-dialog-content');
  const currentRect = content.getBoundingClientRect();
  const layer = content.cloneNode(true);
  layer.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  layer.setAttribute('aria-hidden', 'true');
  layer.classList.add('group-level-previous-layer');
  Object.assign(layer.style, {
    left: `${currentRect.left}px`,
    top: `${currentRect.top}px`,
    width: `${currentRect.width}px`,
    height: `${currentRect.height}px`
  });
  groupDialog.append(layer);

  openGroupDialog(parentId);
  const destination = groupDialogSites.querySelector(`[data-nested-group-id="${CSS.escape(childId)}"]`);
  const destinationRect = destination?.querySelector('.group-icon-grid')?.getBoundingClientRect();
  if (!destinationRect || !currentRect.width) {
    layer.remove();
    return;
  }

  destination.classList.add('group-zoom-destination');
  const parentContent = $('.group-dialog-content');
  parentContent.style.setProperty('--group-level-origin-x', `${destinationRect.left + destinationRect.width / 2 - currentRect.left}px`);
  parentContent.style.setProperty('--group-level-origin-y', `${destinationRect.top + destinationRect.height / 2 - currentRect.top}px`);
  groupDialog.classList.add('is-level-zooming-out');
  const destinationX = destinationRect.left + destinationRect.width / 2;
  const destinationY = destinationRect.top + destinationRect.height / 2;
  const translateX = destinationX - (currentRect.left + currentRect.width / 2);
  const translateY = destinationY - (currentRect.top + currentRect.height / 2);
  const scale = Math.max(.12, Math.min(.34, destinationRect.width / currentRect.width));
  const animation = layer.animate([
    { opacity: 1, filter: 'blur(0)', transform: 'translate(0,0) scale(1)' },
    { opacity: .82, offset: .58, transform: `translate(${translateX * .42}px,${translateY * .42}px) scale(.86)` },
    { opacity: 0, filter: 'blur(3px)', transform: `translate(${translateX}px,${translateY}px) scale(${scale})` }
  ], {
    duration: 520,
    easing: 'cubic-bezier(.32,.02,.18,1)',
    fill: 'forwards'
  });
  animation.finished.finally(() => {
    layer.remove();
    destination.classList.remove('group-zoom-destination');
    destination.classList.add('group-return-target');
    groupDialog.classList.remove('is-level-zooming-out');
    parentContent.style.removeProperty('--group-level-origin-x');
    parentContent.style.removeProperty('--group-level-origin-y');
    setTimeout(() => destination.classList.remove('group-return-target'), 420);
  });
}

function closeGroupDialog({ immediate = false } = {}) {
  if (!groupDialog.open || groupDialog.classList.contains('is-closing')) return;
  if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    groupDialog.close();
    return;
  }
  groupDialog.classList.remove('is-opening');
  groupDialog.classList.add('is-closing');
  const finish = () => {
    groupDialog.classList.remove('is-closing');
    if (groupDialog.open) groupDialog.close();
  };
  const content = $('.group-dialog-content');
  const handleCloseEnd = event => {
    if (event.target !== content) return;
    content.removeEventListener('animationend', handleCloseEnd);
    finish();
  };
  content.addEventListener('animationend', handleCloseEnd);
  setTimeout(finish, 420);
}

function openGroupDialog(groupId, sourceElement = null) {
  activeGroupId = groupId;
  const group = findGroup(groupId);
  if (!group) return;
  const sourceVisual = sourceElement?.querySelector?.('.group-icon-grid') || sourceElement;
  const sourceRect = sourceVisual?.getBoundingClientRect();
  const previousLayer = groupDialog.open && sourceRect
    ? groupDialog.querySelector('.group-dialog-content')?.cloneNode(true)
    : null;
  const siteMap = new Map(allSites().map(site => [site.id, site]));
  const members = group.siteIds.map(id => siteMap.get(id)).filter(Boolean);
  const nestedGroups = childGroups(groupId);
  $('#groupNameInput').value = group.name;
  $('#groupBackButton').hidden = !group.parentId;
  $('#groupDialogSites').innerHTML = members.map(site => {
    return `<a class="group-sort-item" data-site-id="${site.id}" href="${escapeHTML(site.url)}" target="_blank" rel="noreferrer" draggable="false"><span class="group-dialog-icon" style="--site-color:${site.color}">${faviconImage(site, { loading: false })}<span class="icon-fallback">${escapeHTML(site.icon)}</span></span><strong>${escapeHTML(site.name)}</strong></a>`;
  }).join('') + nestedGroups.map(nested => {
    const nestedMembers = collectGroupSiteIds(nested.id).map(id => siteMap.get(id)).filter(Boolean);
    const miniIcons = nestedMembers.slice(0, 4).map(site => {
      return `<span class="group-mini-icon" style="--site-color:${site.color}">${faviconImage(site, { loading: false })}<span class="icon-fallback">${escapeHTML(site.icon)}</span></span>`;
    }).join('');
    return `<button type="button" class="group-sort-item nested-group-item" data-nested-group-id="${nested.id}"><span class="group-icon-grid">${miniIcons}</span><strong>${escapeHTML(nested.name)}</strong><small>${nestedMembers.length} 个项目</small></button>`;
  }).join('');
  if (!groupDialog.open) {
    groupDialog.showModal();
    groupDialog.querySelector('.group-dialog-content')?.focus({ preventScroll: true });
    playGroupDialogOpen(sourceElement);
  } else if (sourceRect) requestAnimationFrame(() => playNestedGroupOpen(sourceRect, previousLayer));
}

function showToast(message, { duration = 1800, actionLabel, onAction } = {}) {
  const toast = $('#toast');
  clearTimeout(showToast.timer);
  clearTimeout(showToast.cleanupTimer);
  clearInterval(showToast.countdownTimer);
  const messageNode = document.createElement('span');
  messageNode.className = 'toast-message';
  messageNode.textContent = message;
  const contentNode = document.createElement('span');
  contentNode.className = 'toast-content';

  if (actionLabel && onAction) {
    const countdown = document.createElement('span');
    countdown.className = 'toast-countdown';
    countdown.style.setProperty('--toast-duration', `${duration}ms`);
    countdown.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="toast-countdown-track" cx="12" cy="12" r="9"></circle><circle class="toast-countdown-ring" cx="12" cy="12" r="9"></circle></svg><b></b>';
    const number = countdown.querySelector('b');
    const endTime = Date.now() + duration;
    const updateCountdown = () => {
      number.textContent = String(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    };
    updateCountdown();
    showToast.countdownTimer = setInterval(updateCountdown, 100);
    contentNode.append(countdown);
  }

  contentNode.append(messageNode);
  toast.replaceChildren(contentNode);

  if (actionLabel && onAction) {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.textContent = actionLabel;
    actionButton.addEventListener('click', () => {
      clearTimeout(showToast.timer);
      clearInterval(showToast.countdownTimer);
      toast.classList.remove('show');
      onAction();
    });
    toast.append(actionButton);
  }

  toast.classList.add('show');
  showToast.timer = setTimeout(() => {
    clearInterval(showToast.countdownTimer);
    toast.classList.remove('show');
    showToast.cleanupTimer = setTimeout(() => {
      if (!toast.classList.contains('show')) toast.replaceChildren();
    }, 250);
  }, duration);
}

function updateTime() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hour = now.getHours();
  const period = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  if (period !== greetingPeriod) {
    greetingPeriod = period;
    rotatingGreeting.setTexts({
      night: ['夜深了', '慢一点', '灵感还在'],
      morning: ['上午好', '灵感已就位', '今天会很好'],
      afternoon: ['下午好', '灵感正好', '状态在线'],
      evening: ['晚上好', '继续发光', '收好灵感']
    }[period]);
  }
}

function doSearch(query) {
  const value = query.trim();
  if (!value) return;
  if (/^https?:\/\//i.test(value)) window.open(value, '_blank', 'noopener');
  else window.open(currentEngine.url + encodeURIComponent(value), '_blank', 'noopener');
}

$('#categoryTabs').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove-category]');
  if (remove) {
    const categoryId = remove.dataset.removeCategory;
    if (categoryId === 'all') return;
    const category = allCategories().find(item => item.id === categoryId);
    if (!category) return;
    const previousCategory = currentCategory;
    const customIndex = customCategories.findIndex(item => item.id === categoryId);
    if (customIndex >= 0) {
      customCategories.splice(customIndex, 1);
      store.set('mos-custom-categories', customCategories);
    } else {
      hiddenBuiltInCategories.add(categoryId);
      store.set('mos-hidden-built-in-categories', [...hiddenBuiltInCategories]);
    }
    if (currentCategory === categoryId) currentCategory = 'all';
    renderCategoryOptions();
    renderSites();
    showToast('分类已删除，网址仍保留在全部导航', {
      duration: 3200,
      actionLabel: '撤销',
      onAction: () => {
        if (customIndex >= 0) {
          customCategories.splice(Math.min(customIndex, customCategories.length), 0, category);
          store.set('mos-custom-categories', customCategories);
        } else {
          hiddenBuiltInCategories = new Set([...hiddenBuiltInCategories].filter(id => id !== categoryId));
          store.set('mos-hidden-built-in-categories', [...hiddenBuiltInCategories]);
        }
        if (previousCategory === categoryId) currentCategory = categoryId;
        renderCategoryOptions();
        renderSites();
        showToast('已恢复分类');
      }
    });
    return;
  }

  if (event.target.closest('[data-add-category]')) {
    $('#categoryDialog').showModal();
    return;
  }

  const button = event.target.closest('.nav-item');
  if (!button) return;
  currentCategory = button.dataset.category;
  searchQuery = '';
  $('#searchInput').value = '';
  renderSites();
});

$('#siteGrid').addEventListener('click', event => {
  const action = event.target.closest('[data-action]');
  if (!action) {
    const card = event.target.closest('.site-card');
    if (!card) return;
    if (suppressCardClick) {
      event.preventDefault();
      return;
    }
    if (card.dataset.groupId) {
      openGroupDialog(card.dataset.groupId, card);
      return;
    }
    if (event.target.closest('.card-link')) return;
    const site = allSites().find(item => item.id === card.dataset.id);
    if (site) window.open(site.url, '_blank', 'noopener');
    return;
  }
  event.preventDefault();
  event.stopPropagation();

  if (action.dataset.action === 'menu') {
    const actions = action.closest('.card-actions');
    const willOpen = !actions.classList.contains('menu-open');
    $$('.card-actions.menu-open').forEach(item => {
      item.classList.remove('menu-open');
      item.querySelector('.more-btn')?.setAttribute('aria-expanded', 'false');
    });
    actions.classList.toggle('menu-open', willOpen);
    action.setAttribute('aria-expanded', String(willOpen));
    return;
  }

  if (action.dataset.action === 'open-add') {
    openSiteDialog();
    return;
  }

  if (action.dataset.action === 'ungroup') {
    const groupId = action.closest('[data-group-id]').dataset.groupId;
    const removedIds = new Set(collectGroupIds(groupId));
    siteGroups = siteGroups.filter(group => !removedIds.has(group.id));
    persistGroups();
    renderSites();
    showToast('分组已解散');
    return;
  }

  const card = action.closest('.site-card');
  const id = card.dataset.id;
  if (action.dataset.action === 'delete') {
    const deletedSite = allSites().find(site => site.id === id);
    const originalIndex = allSites().findIndex(site => site.id === id);
    const isBuiltIn = baseSites.some(site => site.id === id);
    const deletedGroup = siteGroups.find(group => group.siteIds.includes(id));

    if (isBuiltIn) hiddenSites.add(id);
    else customSites = customSites.filter(site => site.id !== id);
    siteOrder = siteOrder.filter(siteId => siteId !== id);
    siteGroups = siteGroups
      .map(group => ({ ...group, siteIds: group.siteIds.filter(siteId => siteId !== id) }))
      .filter(group => group.siteIds.length > 1);
    store.set('mos-hidden-sites', [...hiddenSites]);
    store.set('mos-custom-sites', customSites);
    store.set('mos-site-order', siteOrder);
    persistGroups();
    renderSites();
    showToast('网址已移除', {
      duration: 6000,
      actionLabel: '撤销',
      onAction: () => {
        if (isBuiltIn) hiddenSites.delete(id);
        else if (deletedSite && !customSites.some(site => site.id === id)) customSites.push(deletedSite);
        const restoredOrder = allSites().map(site => site.id).filter(siteId => siteId !== id);
        restoredOrder.splice(Math.min(originalIndex, restoredOrder.length), 0, id);
        siteOrder = restoredOrder;
        if (deletedGroup) {
          siteGroups = siteGroups.filter(group => group.id !== deletedGroup.id && !group.siteIds.some(siteId => deletedGroup.siteIds.includes(siteId)));
          siteGroups.push(deletedGroup);
        }

        store.set('mos-hidden-sites', [...hiddenSites]);
        store.set('mos-custom-sites', customSites);
        store.set('mos-site-order', siteOrder);
        persistGroups();
        renderSites();
        showToast('已撤销删除');
      }
    });
  }
});

document.addEventListener('click', event => {
  if (event.target.closest('.card-actions')) return;
  $$('.card-actions.menu-open').forEach(actions => {
    actions.classList.remove('menu-open');
    actions.querySelector('.more-btn')?.setAttribute('aria-expanded', 'false');
  });
});

$('#siteGrid').addEventListener('keydown', event => {
  const groupCard = event.target.closest('[data-group-id]');
  if (!groupCard || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  openGroupDialog(groupCard.dataset.groupId, groupCard);
});

document.addEventListener('error', event => {
  if (!event.target.matches('.site-favicon')) return;
  const image = event.target;
  let sources = [];
  try { sources = JSON.parse(image.dataset.faviconSources || '[]'); } catch { sources = []; }
  const index = Number(image.dataset.faviconIndex || 0);
  if (sources[index]) {
    image.dataset.faviconIndex = String(index + 1);
    image.src = sources[index];
    return;
  }
  const bestSource = image.dataset.faviconBest;
  const bestSize = Number(image.dataset.faviconBestSize || 0);
  if (bestSource && bestSize >= 32 && image.src !== bestSource) {
    image.src = bestSource;
    return;
  }
  image.hidden = true;
  image.nextElementSibling?.classList.add('visible');
}, true);

function faviconRequiredPixels(image) {
  const renderedSize = Math.max(image.clientWidth, image.clientHeight, 32);
  return Math.ceil(renderedSize * Math.min(window.devicePixelRatio || 1, 2));
}

function finishFaviconCheck(image, source, pixelSize, isLowResolution = false) {
  if (source && image.src !== source) {
    image.src = source;
    return;
  }
  image.classList.remove('favicon-checking');
  image.classList.toggle('favicon-low-resolution', isLowResolution);
  image.dataset.faviconQuality = isLowResolution ? 'limited' : 'sharp';
  if (source && image.dataset.faviconHost) {
    const cached = faviconQualityCache.get(image.dataset.faviconHost);
    if (!cached || pixelSize > cached.pixelSize) {
      faviconQualityCache.set(image.dataset.faviconHost, { source, pixelSize });
    }
  }
}

document.addEventListener('load', event => {
  if (!event.target.matches('.site-favicon')) return;
  const image = event.target;
  const pixelSize = Math.min(image.naturalWidth || 0, image.naturalHeight || 0);
  const isVectorSource = (image.currentSrc || image.src).includes('cdn.simpleicons.org/');
  const bestSize = Number(image.dataset.faviconBestSize || 0);
  if (pixelSize > bestSize) {
    image.dataset.faviconBest = image.currentSrc || image.src;
    image.dataset.faviconBestSize = String(pixelSize);
  }

  const requiredPixels = faviconRequiredPixels(image);
  if (isVectorSource || pixelSize >= requiredPixels) {
    finishFaviconCheck(image, image.src, pixelSize);
    return;
  }

  let sources = [];
  try { sources = JSON.parse(image.dataset.faviconSources || '[]'); } catch { sources = []; }
  const index = Number(image.dataset.faviconIndex || 0);
  if (sources[index]) {
    image.dataset.faviconIndex = String(index + 1);
    image.src = sources[index];
    return;
  }

  const bestSource = image.dataset.faviconBest;
  const finalSize = Number(image.dataset.faviconBestSize || 0);
  if (bestSource && finalSize >= 32) {
    finishFaviconCheck(image, bestSource, finalSize, finalSize < requiredPixels);
    return;
  }
  image.hidden = true;
  image.nextElementSibling?.classList.add('visible');
}, true);

let suppressCardClick = false;
let pointerDrag = null;
const siteGrid = $('#siteGrid');
const sortableSiteSelector = '.site-card[data-id], .site-group-card[data-group-id]';
const siteDragEffect = createDragSortEffect({ container: siteGrid, itemSelector: sortableSiteSelector });
const bookmarkGroupActivationDelay = 320;
const bookmarkGroupSnapMargin = 16;

function saveVisibleSiteOrder() {
  const visibleOrder = $$('#siteGrid .site-card').flatMap(card => card.dataset.groupId
    ? collectGroupSiteIds(card.dataset.groupId)
    : card.dataset.id ? [card.dataset.id] : []);
  const visibleSet = new Set(visibleOrder);
  let visibleIndex = 0;
  siteOrder = allSites().map(site => visibleSet.has(site.id) ? visibleOrder[visibleIndex++] : site.id);
  store.set('mos-site-order', siteOrder);
}

function clearDropTargets(dragState) {
  clearTimeout(dragState.groupTimer);
  document.body.classList.remove('bookmark-group-candidate', 'bookmark-group-ready');
  siteDragEffect.setMagnetTarget(null);
  dragState.groupTarget?.classList.remove('group-target');
  dragState.groupCandidate?.classList.remove('group-candidate');
  dragState.reorderTarget?.classList.remove('reorder-target', 'drop-after');
  dragState.groupTarget = null;
  dragState.reorderTarget = null;
  dragState.reorderAfter = false;
  dragState.groupCandidate = null;
  dragState.groupCandidateX = 0;
  dragState.groupCandidateY = 0;
  dragState.groupTimer = null;
  dragState.lastSortTarget = null;
}

function scheduleGroupTarget(target, event) {
  if (pointerDrag.groupTarget && pointerDrag.groupTarget !== target) {
    pointerDrag.groupTarget.classList.remove('group-target');
    pointerDrag.groupTarget = null;
  }
  const sameTarget = pointerDrag.groupCandidate === target;
  const movedWithinTarget = sameTarget && Math.hypot(event.clientX - pointerDrag.groupCandidateX, event.clientY - pointerDrag.groupCandidateY) >= 4;
  if (sameTarget && !movedWithinTarget) return;
  clearTimeout(pointerDrag.groupTimer);
  pointerDrag.groupCandidate?.classList.remove('group-candidate');
  pointerDrag.groupCandidate = target;
  pointerDrag.groupCandidateX = event.clientX;
  pointerDrag.groupCandidateY = event.clientY;
  siteDragEffect.setMagnetTarget(null);
  pointerDrag.groupTimer = setTimeout(() => {
    if (!pointerDrag || pointerDrag.groupCandidate !== target) return;
    pointerDrag.reorderTarget?.classList.remove('reorder-target', 'drop-after');
    pointerDrag.reorderTarget = null;
    pointerDrag.groupTarget?.classList.remove('group-target');
    pointerDrag.groupTarget = target;
    target.classList.add('group-target');
    document.body.classList.add('bookmark-group-ready');
    siteDragEffect.setMagnetTarget(target, .24);
  }, bookmarkGroupActivationDelay);
}

function cancelGroupTarget() {
  if (!pointerDrag) return;
  clearTimeout(pointerDrag.groupTimer);
  document.body.classList.remove('bookmark-group-candidate', 'bookmark-group-ready');
  siteDragEffect.setMagnetTarget(null);
  pointerDrag.groupTimer = null;
  pointerDrag.groupCandidate?.classList.remove('group-candidate');
  pointerDrag.groupCandidate = null;
  pointerDrag.groupCandidateX = 0;
  pointerDrag.groupCandidateY = 0;
  pointerDrag.groupTarget?.classList.remove('group-target');
  pointerDrag.groupTarget = null;
}

siteGrid.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('.card-actions')) return;
  const card = event.target.closest(sortableSiteSelector);
  if (!card) return;
  pointerDrag = {
    pointerId: event.pointerId,
    card,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    groupTarget: null,
    groupCandidate: null,
    groupCandidateX: 0,
    groupCandidateY: 0,
    groupTimer: null,
    reorderTarget: null,
    reorderAfter: false,
    lastSortTarget: null,
  };
});

siteGrid.addEventListener('pointermove', event => {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
  const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
  if (!pointerDrag.moved && distance < 6) return;

  if (!pointerDrag.moved) {
    pointerDrag.moved = true;
    suppressCardClick = true;
    siteGrid.setPointerCapture?.(event.pointerId);
    siteDragEffect.start(pointerDrag.card, event);
  }

  event.preventDefault();
  siteDragEffect.move(event);
  let target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.site-card');
  const stickyGroupTarget = pointerDrag.groupTarget || pointerDrag.groupCandidate;
  if ((!target || target === pointerDrag.card) && stickyGroupTarget) {
    const stickyRect = stickyGroupTarget.getBoundingClientRect();
    const insideSnapArea = event.clientX >= stickyRect.left - bookmarkGroupSnapMargin
      && event.clientX <= stickyRect.right + bookmarkGroupSnapMargin
      && event.clientY >= stickyRect.top - bookmarkGroupSnapMargin
      && event.clientY <= stickyRect.bottom + bookmarkGroupSnapMargin;
    if (insideSnapArea) target = stickyGroupTarget;
  }
  if (!target || target === pointerDrag.card || target.parentElement !== siteGrid) {
    clearDropTargets(pointerDrag);
    return;
  }

  const rect = target.getBoundingClientRect();
  const canGroup = Boolean(pointerDrag.card.dataset.id || pointerDrag.card.dataset.groupId)
    && currentCategory === 'all'
    && !searchQuery.trim();
  const inGroupZone = Boolean(target.dataset.groupId) || (
    Math.abs(event.clientX - (rect.left + rect.width / 2)) < rect.width * .32 &&
    Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * .38
  );
  if (pointerDrag.groupTarget === target) {
    return;
  }
  if (canGroup && inGroupZone) {
    scheduleGroupTarget(target, event);
  } else cancelGroupTarget();
  if (pointerDrag.groupTarget === target) return;
  const sortableCards = [...siteGrid.querySelectorAll(sortableSiteSelector)];
  const sourceIndex = sortableCards.indexOf(pointerDrag.card);
  const targetIndex = sortableCards.indexOf(target);
  const placeAfter = sourceIndex < targetIndex;
  if (pointerDrag.reorderTarget !== target) pointerDrag.reorderTarget?.classList.remove('reorder-target', 'drop-after');
  pointerDrag.reorderTarget = target;
  pointerDrag.reorderAfter = placeAfter;
  target.classList.add('reorder-target');
  target.classList.toggle('drop-after', placeAfter);
  pointerDrag.lastSortTarget = target;
});

function finishPointerDrag(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
  const dragState = pointerDrag;
  const { pointerId, card, moved, reorderTarget, reorderAfter } = dragState;
  const groupTarget = dragState.groupTarget;
  pointerDrag = null;
  if (siteGrid.hasPointerCapture?.(pointerId)) siteGrid.releasePointerCapture(pointerId);
  clearDropTargets(dragState);

  if (moved && groupTarget) {
    siteDragEffect.finish({ settle: false });
    const result = createOrExtendGroup(card, groupTarget);
    renderSites();
    if (result === 'created') showToast('已创建分组，点击可改名');
    if (result === 'extended') showToast('已加入分组');
    if (result === 'nested-created') showToast('已创建上一级分组，点击可改名');
  } else if (moved) {
    if (reorderTarget?.isConnected && reorderTarget !== card) {
      const beforeRects = new Map([...siteGrid.querySelectorAll(sortableSiteSelector)].map(item => [item, item.getBoundingClientRect()]));
      siteGrid.insertBefore(card, reorderAfter ? reorderTarget.nextSibling : reorderTarget);
      siteDragEffect.reflow(beforeRects, card);
    }
    saveVisibleSiteOrder();
    siteDragEffect.finish();
    showToast('排序已保存');
  } else {
    siteDragEffect.finish({ settle: false });
  }
  setTimeout(() => { suppressCardClick = false; }, 0);
}

siteGrid.addEventListener('pointerup', finishPointerDrag);
siteGrid.addEventListener('pointercancel', finishPointerDrag);

function switchWorkspaceView(view) {
  if (currentWorkspaceView === 'notes' && view !== 'notes') saveActiveNote();
  if (currentWorkspaceView === 'notes' && view !== 'notes' && !$('#noteSharePanel').hidden) closeNoteSharePanel();
  currentWorkspaceView = view;
  const showBookmarks = view === 'bookmarks';
  const showGallery = view === 'gallery';
  const showNotes = view === 'notes';
  if (showGallery) renderGallery();
  if (showNotes) loadActiveNote();
  document.body.classList.toggle('notes-workspace-active', showNotes);
  document.body.classList.toggle('gallery-workspace-active', showGallery);
  $('#categoryTabs').hidden = !showBookmarks;
  $('#bookmarksView').hidden = !showBookmarks;
  $('#galleryView').hidden = !showGallery;
  $('#notesView').hidden = !showNotes;
  $$('.workspace-nav [data-workspace-view]').forEach(button => {
    const active = button.dataset.workspaceView === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function clampNoteColumnWidth(type, width) {
  const numericWidth = Number.isFinite(width) ? width : type === 'sidebar' ? 270 : 190;
  if (type === 'outline') return Math.round(Math.max(120, numericWidth));
  return Math.round(Math.max(210, numericWidth));
}

function applySavedNoteColumnWidths() {
  const shell = $('.notes-shell');
  const sidebarWidth = clampNoteColumnWidth('sidebar', Number(store.get('mos-note-sidebar-width', 270)) || 270);
  const outlineWidth = clampNoteColumnWidth('outline', Number(store.get('mos-note-outline-width', 190)) || 190);
  shell.style.setProperty('--notes-sidebar-width', `${sidebarWidth}px`);
  shell.style.setProperty('--note-outline-width', `${outlineWidth}px`);
}

function setNoteOutlineCollapsed(collapsed, { persist = true } = {}) {
  noteOutlineCollapsed = Boolean(collapsed);
  $('.notes-shell').classList.toggle('note-outline-collapsed', noteOutlineCollapsed);
  const button = $('#toggleNoteOutline');
  button.textContent = noteOutlineCollapsed ? '»' : '«';
  button.setAttribute('aria-expanded', String(!noteOutlineCollapsed));
  button.setAttribute('aria-label', noteOutlineCollapsed ? '展开文档快捷导航' : '收起文档快捷导航');
  button.title = noteOutlineCollapsed ? '展开快捷导航' : '收起快捷导航';
  if (persist) store.set('mos-note-outline-collapsed', noteOutlineCollapsed);
}

applySavedNoteColumnWidths();
setNoteOutlineCollapsed(noteOutlineCollapsed, { persist: false });

$('#toggleNoteOutline').addEventListener('click', () => setNoteOutlineCollapsed(!noteOutlineCollapsed));

$('.notes-shell').addEventListener('pointerdown', event => {
  const handle = event.target.closest('[data-note-resize]');
  if (!handle || window.innerWidth <= 900) return;
  const type = handle.dataset.noteResize;
  if (type === 'outline' && noteOutlineCollapsed) return;
  const target = type === 'sidebar' ? $('.notes-sidebar') : $('.note-outline');
  noteColumnResizeState = { type, startX: event.clientX, startWidth: target.getBoundingClientRect().width };
  handle.setPointerCapture?.(event.pointerId);
  handle.classList.add('dragging');
  document.body.classList.add('resizing-note-columns');
  $('#noteSelectionBubble').hidden = true;
  event.preventDefault();
});

document.addEventListener('pointermove', event => {
  if (!noteColumnResizeState) return;
  const width = clampNoteColumnWidth(noteColumnResizeState.type, noteColumnResizeState.startWidth + event.clientX - noteColumnResizeState.startX);
  const property = noteColumnResizeState.type === 'sidebar' ? '--notes-sidebar-width' : '--note-outline-width';
  $('.notes-shell').style.setProperty(property, `${width}px`);
});

document.addEventListener('pointerup', () => {
  if (!noteColumnResizeState) return;
  const type = noteColumnResizeState.type;
  const target = type === 'sidebar' ? $('.notes-sidebar') : $('.note-outline');
  store.set(type === 'sidebar' ? 'mos-note-sidebar-width' : 'mos-note-outline-width', clampNoteColumnWidth(type, target.getBoundingClientRect().width));
  noteColumnResizeState = null;
  $$('.note-column-resizer').forEach(handle => handle.classList.remove('dragging'));
  document.body.classList.remove('resizing-note-columns');
});

$('.workspace-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-workspace-view]');
  if (button) switchWorkspaceView(button.dataset.workspaceView);
});

$('#notesList').addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-note-delete-id]');
  if (deleteButton) {
    deleteNoteById(deleteButton.dataset.noteDeleteId);
    return;
  }
  const button = event.target.closest('[data-note-id]');
  if (!button || button.dataset.noteId === activeNoteId) return;
  saveActiveNote();
  activeNoteId = button.dataset.noteId;
  persistNotes();
  loadActiveNote();
});

$('#newNote').addEventListener('click', createNote);
$('#deleteNote').addEventListener('click', deleteActiveNote);
$('#openNoteShare').addEventListener('click', openNoteSharePanel);
$('#closeNoteShare').addEventListener('click', closeNoteSharePanel);
$('#noteShareBackdrop').addEventListener('click', closeNoteSharePanel);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#noteSharePanel').hidden) closeNoteSharePanel();
});
$('#noteShareEnabled').addEventListener('click', () => {
  const note = noteById();
  if (!note) return;
  note.sharing.enabled = !note.sharing.enabled;
  if (note.sharing.enabled) noteShareToken(note);
  persistNotes();
  renderNoteSharePanel();
  showToast(note.sharing.enabled ? '链接分享已开启' : '链接分享已关闭');
});
$('.note-permission-options').addEventListener('click', event => {
  const button = event.target.closest('[data-note-permission]');
  const note = noteById();
  if (!button || !note?.sharing?.enabled) return;
  note.sharing.permission = button.dataset.notePermission === 'edit' ? 'edit' : 'view';
  persistNotes();
  renderNoteSharePanel();
  showToast(note.sharing.permission === 'edit' ? '已设为可编辑' : '已设为仅查看');
});
$('#copyNoteShareLink').addEventListener('click', async () => {
  const note = noteById();
  if (!note?.sharing?.enabled) return;
  const link = noteShareURL(note);
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    $('#noteShareLink').select();
    document.execCommand('copy');
  }
  const button = $('#copyNoteShareLink');
  button.textContent = '已复制';
  showToast('分享链接已复制');
  setTimeout(() => { button.textContent = '复制链接'; }, 1400);
});
$('#insertNoteImage').addEventListener('pointerdown', rememberNoteCaret);
$('#insertNoteImage').addEventListener('click', () => $('#noteImageInput').click());
$('#bubbleInsertNoteImage').addEventListener('pointerdown', event => {
  event.preventDefault();
  rememberNoteCaret();
  savedNoteCaretRange?.collapse(false);
});
$('#bubbleInsertNoteImage').addEventListener('click', () => $('#noteImageInput').click());
$('#noteImageInput').addEventListener('change', event => {
  const [file] = event.target.files;
  if (file) insertNoteImageFile(file);
});
$('#noteTitle').addEventListener('beforeinput', event => captureNoteHistory(`title:${event.inputType}`));
$('#noteEditor').addEventListener('beforeinput', event => captureNoteHistory(`editor:${event.inputType}`));
$('#noteTitle').addEventListener('input', scheduleNoteSave);
$('#noteEditor').addEventListener('input', event => {
  const selection = window.getSelection();
  const inputNode = selection?.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection?.anchorNode;
  const caption = event.target.closest?.('#noteEditor figcaption') || inputNode?.closest?.('#noteEditor figcaption');
  if (caption) updateNoteCaptionState(caption);
  ensureNoteFigureCaptions();
  normalizeEditedNoteImageGrids();
  requestAnimationFrame(syncAllNoteImageGridLayouts);
  renderNoteOutline();
  scheduleNoteSave();
  requestAnimationFrame(renderNoteSlashMenu);
});
$('#noteEditor').addEventListener('focusin', event => {
  const cell = event.target.closest?.('td, th') || noteTableCellFromSelection();
  if (cell) requestAnimationFrame(() => showNoteTableTools(cell));
});
$('#noteEditor').addEventListener('click', event => {
  const cell = event.target.closest?.('td, th');
  if (cell) requestAnimationFrame(() => showNoteTableTools(cell));
});
$('#noteTableTools').addEventListener('pointerdown', event => {
  if (event.target.closest('[data-note-table-action]')) event.preventDefault();
});
$('#noteTableTools').addEventListener('click', event => {
  const button = event.target.closest('[data-note-table-action]');
  if (button) runNoteTableAction(button.dataset.noteTableAction);
});
$('#noteTablePickerGrid').addEventListener('pointermove', event => {
  updateNoteTablePickerSize(event.target.closest('.note-table-picker-cell'));
});
$('#noteTablePickerGrid').addEventListener('pointerdown', event => {
  const cell = event.target.closest('.note-table-picker-cell');
  if (!cell || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  noteTablePickerDragging = true;
  $('#noteTablePicker').classList.add('dragging');
  updateNoteTablePickerSize(cell);
});
$('#noteTablePickerGrid').addEventListener('click', event => {
  if (event.detail === 0 && event.target.closest('.note-table-picker-cell')) commitNoteTablePicker();
});
document.addEventListener('pointerup', event => {
  if (!noteTablePickerDragging) return;
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.note-table-picker-cell');
  if (cell) updateNoteTablePickerSize(cell);
  commitNoteTablePicker();
});
document.addEventListener('pointercancel', () => {
  noteTablePickerDragging = false;
  $('#noteTablePicker').classList.remove('dragging');
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#noteTableTools, #noteEditor table.note-table')) hideNoteTableTools();
  if (!event.target.closest('#noteTablePicker, [data-note-slash-index]')) closeNoteTablePicker();
});
$('.note-document').addEventListener('scroll', () => {
  if (!$('#noteTableTools').hidden) positionNoteTableTools();
}, { passive: true });
window.addEventListener('resize', () => {
  if (!$('#noteTableTools').hidden) positionNoteTableTools();
});
$('#noteEditor').addEventListener('pointerdown', handleNoteMarqueePointerDown);
document.addEventListener('pointermove', updateNoteMarqueeSelection, { passive: false });
document.addEventListener('pointerup', finishNoteMarqueeSelection);
document.addEventListener('pointercancel', finishNoteMarqueeSelection);
$('#noteEditor').addEventListener('pointerover', event => {
  const heading = event.target.closest?.('h1, h2, h3, h4, h5');
  if (heading && $('#noteEditor').contains(heading)) showNoteHeadingTools(heading);
  const block = topLevelNoteBlock(event.target);
  if (block) showNoteBlockDragHandle(block);
});
const noteCalloutEmojis = ['💡', '⭐', '🎯', '📌', '✅', '⚠️', '❗', '❓', '💥', '🚀', '🎉', '👍', '👀', '📝', '🧠', '❤️', '🟢', '🔵', '🟡', '🟣', '🔥', '🌱', '🔔', '💬'];
$('#noteCalloutEmojiMenu').innerHTML = noteCalloutEmojis.map(emoji => `<button type="button" role="menuitem" data-note-callout-emoji="${emoji}" aria-label="使用 ${emoji}">${emoji}</button>`).join('');

function showNoteCalloutEmojiMenu(callout) {
  activeNoteCallout = callout;
  const menu = $('#noteCalloutEmojiMenu');
  menu.hidden = false;
  const rect = callout.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(window.innerWidth - menuRect.width - 12, Math.max(12, rect.left))}px`;
  menu.style.top = `${rect.top - menuRect.height - 8 >= 12 ? rect.top - menuRect.height - 8 : rect.bottom + 8}px`;
  menu.querySelectorAll('[data-note-callout-emoji]').forEach(button => button.classList.toggle('active', button.dataset.noteCalloutEmoji === callout.dataset.emoji));
}

$('#noteEditor').addEventListener('pointerdown', event => {
  const callout = event.target.closest?.('.note-callout');
  if (!callout) return;
  const rect = callout.getBoundingClientRect();
  if (event.clientX > rect.left + 48) return;
  event.preventDefault();
  showNoteCalloutEmojiMenu(callout);
});
$('#noteCalloutEmojiMenu').addEventListener('pointerdown', event => event.preventDefault());
$('#noteCalloutEmojiMenu').addEventListener('click', event => {
  const button = event.target.closest('[data-note-callout-emoji]');
  if (!button || !activeNoteCallout?.isConnected) return;
  captureNoteHistory('');
  activeNoteCallout.dataset.emoji = button.dataset.noteCalloutEmoji;
  $('#noteCalloutEmojiMenu').hidden = true;
  scheduleNoteSave();
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#noteCalloutEmojiMenu, .note-callout')) $('#noteCalloutEmojiMenu').hidden = true;
});
$('#noteEditor').addEventListener('pointermove', event => {
  const heading = event.target.closest?.('h1, h2, h3, h4, h5');
  if (heading && $('#noteEditor').contains(heading)) showNoteHeadingTools(heading);
  else if (!event.relatedTarget?.closest?.('#noteHeadingTools')) hideNoteHeadingTools();
  const block = topLevelNoteBlock(event.target);
  if (block) showNoteBlockDragHandle(block);
});
$('#noteEditor').addEventListener('pointerleave', event => {
  if (!event.relatedTarget?.closest?.('#noteBlockDragHandle')) hideNoteBlockDragHandle();
});
$('#noteBlockDragHandle').addEventListener('pointerenter', () => clearTimeout(noteBlockHandleHideTimer));
$('#noteBlockDragHandle').addEventListener('pointerleave', event => {
  if (!event.relatedTarget?.closest?.('#noteEditor')) hideNoteBlockDragHandle();
});
$('#noteBlockDragHandle').addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  if (!activeNoteBlock?.isConnected) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  noteBlockPointerState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, block: activeNoteBlock };
});
document.addEventListener('pointermove', updateNoteBlockPointerDrag, { passive: false });
document.addEventListener('pointerup', finishNoteBlockPointerDrag);
document.addEventListener('pointercancel', finishNoteBlockPointerDrag);
$('#noteTitle').addEventListener('blur', saveActiveNote);
$('#noteEditor').addEventListener('blur', saveActiveNote);
$('#noteTitle').addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  $('#noteEditor').focus();
});
$('#noteEditor').addEventListener('paste', event => {
  closeNoteSlashMenu();
  captureNoteHistory('');
  const richHTML = event.clipboardData.getData('text/html');
  const plainText = event.clipboardData.getData('text/plain');
  const imageFile = [...event.clipboardData.files].find(file => file.type.startsWith('image/'));
  if (imageFile && !richHTML && !plainText.trim()) {
    event.preventDefault();
    rememberNoteCaret();
    insertNoteImageFile(imageFile);
    return;
  }
  event.preventDefault();
  const safeHTML = richHTML ? sanitizeNoteHTML(richHTML) : '';
  const safeContainer = document.createElement('div');
  safeContainer.innerHTML = safeHTML;
  const hasRichContent = Boolean(safeContainer.textContent?.trim() || safeContainer.querySelector('img, table, hr'));
  if (hasRichContent) document.execCommand('insertHTML', false, safeHTML);
  else if (imageFile) {
    rememberNoteCaret();
    insertNoteImageFile(imageFile);
    return;
  } else document.execCommand('insertText', false, plainText);
  prepareNoteImages();
  ensureNoteFigureCaptions();
  normalizeEditedNoteImageGrids();
  renderNoteOutline();
  scheduleNoteSave();
});
$('#noteEditor').addEventListener('dragstart', event => {
  const figure = event.target.closest?.('figure');
  if (!figure || !event.target.closest('img')) return;
  draggedNoteFigure = figure;
  noteImageWasDragged = true;
  figure.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/x-mos-note-image', 'move');
  $('#noteSelectionBubble').hidden = true;
});
$('#noteEditor').addEventListener('dragover', event => {
  if (draggedNoteBlock) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateNoteBlockDropIndicator(nearestNoteBlockForDrop(event.target, event.clientY), event.clientY);
    return;
  }
  if (draggedNoteFigure) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const hoveredFigure = event.target.closest?.('figure');
    updateNoteDropIndicator(event.clientX, event.clientY, hoveredFigure === draggedNoteFigure ? null : hoveredFigure, draggedNoteFigure);
    return;
  }
  const hasImageFile = [...event.dataTransfer.items].some(item => item.kind === 'file' && item.type.startsWith('image/'));
  const hasImageSource = event.dataTransfer.types.includes('text/html') || event.dataTransfer.types.includes('text/uri-list');
  if (!hasImageFile && !hasImageSource) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  $('#noteSelectionBubble').hidden = true;
  updateNoteDropIndicator(event.clientX, event.clientY, event.target.closest?.('figure'));
});
$('#noteEditor').addEventListener('dragleave', event => {
  if (!$('#noteEditor').contains(event.relatedTarget)) hideNoteDropIndicator();
});
$('#noteEditor').addEventListener('drop', event => {
  if (draggedNoteBlock) {
    event.preventDefault();
    commitNoteBlockDrop();
    finishNoteBlockDrag();
    return;
  }
  if (draggedNoteFigure) {
    event.preventDefault();
    const hoveredFigure = event.target.closest?.('figure');
    updateNoteDropIndicator(event.clientX, event.clientY, hoveredFigure === draggedNoteFigure ? null : hoveredFigure, draggedNoteFigure);
    const movedMode = noteImageDropPlacement?.mode || '';
    captureNoteHistory('');
    const moved = placeNoteFigure(draggedNoteFigure, noteImageDropPlacement);
    draggedNoteFigure.classList.remove('dragging');
    draggedNoteFigure = null;
    noteImageDropPlacement = null;
    hideNoteDropIndicator();
    if (moved) {
      prepareNoteImages();
      scheduleNoteSave();
      showToast(movedMode.startsWith('column-') ? '图片布局已更新' : '图片顺序已更新');
    }
    return;
  }
  const imageFile = [...event.dataTransfer.files].find(file => file.type.startsWith('image/'));
  const imageUrl = imageFile ? '' : draggedImageUrl(event.dataTransfer);
  if (!imageFile && !imageUrl) return;
  event.preventDefault();
  updateNoteDropIndicator(event.clientX, event.clientY, event.target.closest?.('figure'));
  const placement = noteImageDropPlacement;
  noteImageDropPlacement = null;
  hideNoteDropIndicator();
  if (imageFile) insertNoteImageFile(imageFile, placement);
  else insertNoteImageUrl(imageUrl, '拖入的图片', placement);
});
document.addEventListener('dragend', () => {
  finishNoteBlockDrag();
  draggedNoteFigure?.classList.remove('dragging');
  draggedNoteFigure = null;
  noteImageDropPlacement = null;
  hideNoteDropIndicator();
  setTimeout(() => { noteImageWasDragged = false; }, 0);
});
$('#noteEditor').addEventListener('click', event => {
  const image = event.target.closest?.('figure img');
  if (!image || noteImageWasDragged) return;
  openNoteImagePreview(image);
});
$('#noteImagePreview').addEventListener('click', event => {
  if (event.target === $('#noteImagePreview')) {
    $('#noteImagePreview').close();
    return;
  }
  if (event.target === $('#noteImagePreviewSource')) {
    event.target.classList.toggle('zoomed');
    $('#noteImagePreview').classList.toggle('zoomed', event.target.classList.contains('zoomed'));
  }
});
$('#noteImagePreview').addEventListener('close', () => {
  $('#noteImagePreviewSource').classList.remove('zoomed');
  $('#noteImagePreview').classList.remove('zoomed');
});
$('#noteSelectionBubble').addEventListener('pointerdown', event => {
  if (event.target.closest('[data-note-command], #noteLineSpacingButton')) event.preventDefault();
});
$('#noteSelectionBubble').addEventListener('click', event => {
  runNoteFormatCommand(event.target.closest('[data-note-command]'), { restoreSelection: true });
});
$('#noteLineSpacingButton').addEventListener('click', event => {
  event.stopPropagation();
  if ($('#noteLineSpacingMenu').hidden) positionNoteLineSpacingMenu();
  else $('#noteLineSpacingMenu').hidden = true;
});
$('#noteLineSpacingMenu').addEventListener('pointerdown', event => {
  if (event.target.closest('[data-note-line-spacing]')) event.preventDefault();
});
$('#noteLineSpacingMenu').addEventListener('click', event => {
  const option = event.target.closest('[data-note-line-spacing]');
  if (option) applyNoteLineSpacing(option.dataset.noteLineSpacing);
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#noteLineSpacingMenu, #noteLineSpacingButton')) $('#noteLineSpacingMenu').hidden = true;
});
document.addEventListener('selectionchange', () => {
  rememberNoteCaret();
  const tableCell = noteTableCellFromSelection();
  if (tableCell) showNoteTableTools(tableCell);
  const bubble = $('#noteSelectionBubble');
  if (noteSelectionPointerActive) {
    bubble.hidden = true;
    return;
  }
  if (!selectionIsInsideNote()) bubble.hidden = true;
  else if (!bubble.hidden) requestAnimationFrame(positionNoteSelectionBubble);
});
$('#noteEditor').addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  noteSelectionPointerActive = true;
  $('#noteSelectionBubble').hidden = true;
  closeNoteSlashMenu();
});
document.addEventListener('pointerup', () => {
  if (!noteSelectionPointerActive) return;
  noteSelectionPointerActive = false;
  requestAnimationFrame(positionNoteSelectionBubble);
});
document.addEventListener('pointercancel', () => {
  noteSelectionPointerActive = false;
  $('#noteSelectionBubble').hidden = true;
});
$('#noteEditor').addEventListener('keyup', event => {
  requestAnimationFrame(positionNoteSelectionBubble);
  if (event.key === '/' || !$('#noteSlashMenu').hidden) requestAnimationFrame(renderNoteSlashMenu);
});
$('#noteEditor').addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#noteTablePicker').hidden) {
    event.preventDefault();
    closeNoteTablePicker();
    $('#noteEditor').focus();
    return;
  }
  if (handleNoteTableTab(event)) return;
  if (noteMarqueeBlocks.length && (event.key === 'Backspace' || event.key === 'Delete')) {
    event.preventDefault();
    deleteNoteMarqueeBlocks();
    return;
  }
  if (noteMarqueeBlocks.length && event.key === 'Escape') {
    event.preventDefault();
    clearNoteMarqueeSelection();
    return;
  }
  if ($('#noteSlashMenu').hidden) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!noteSlashItems.length) return;
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    noteSlashActiveIndex = (noteSlashActiveIndex + direction + noteSlashItems.length) % noteSlashItems.length;
    renderNoteSlashMenu();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    executeNoteSlashCommand(noteSlashItems[noteSlashActiveIndex]);
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    closeNoteSlashMenu();
  }
});
$('#noteSlashMenu').addEventListener('pointerdown', event => {
  if (event.target.closest('[data-note-slash-index]')) event.preventDefault();
});
$('#noteSlashMenu').addEventListener('click', event => {
  const button = event.target.closest('[data-note-slash-index]');
  if (button) executeNoteSlashCommand(noteSlashItems[Number(button.dataset.noteSlashIndex)]);
});
$('#noteHeadingTools').addEventListener('pointerenter', () => clearTimeout(noteHeadingToolsHideTimer));
$('#noteHeadingTools').addEventListener('pointerleave', () => hideNoteHeadingTools());
$('#noteHeadingTools').addEventListener('pointerdown', event => event.preventDefault());
$('#noteHeadingCollapse').addEventListener('click', toggleActiveNoteHeadingCollapse);
$('#noteHeadingLevel').addEventListener('click', () => {
  const menu = $('#noteHeadingLevelMenu');
  menu.hidden = !menu.hidden;
  $('#noteHeadingLevel').setAttribute('aria-expanded', String(!menu.hidden));
  positionNoteHeadingTools();
});
$('#noteHeadingLevelMenu').addEventListener('click', event => {
  const button = event.target.closest('[data-note-heading-level]');
  if (button) changeActiveNoteHeadingLevel(button.dataset.noteHeadingLevel);
});
$('.note-document').addEventListener('scroll', () => requestAnimationFrame(() => {
  positionNoteSelectionBubble();
  if (!$('#noteSlashMenu').hidden) renderNoteSlashMenu();
  if (!$('#noteHeadingTools').hidden) positionNoteHeadingTools();
  updateActiveNoteOutline();
  if (noteOutlineNavigationTarget !== null) scheduleNoteOutlineNavigationEnd();
  positionNoteBlockDragHandle();
}));
window.addEventListener('resize', () => requestAnimationFrame(positionNoteSelectionBubble));
window.addEventListener('resize', () => requestAnimationFrame(syncAllNoteImageGridLayouts));
document.addEventListener('keydown', event => {
  if (currentWorkspaceView !== 'notes' || !(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() === 'z' && !event.altKey) {
    event.preventDefault();
    stepNoteHistory(event.shiftKey ? 'redo' : 'undo');
    return;
  }
  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveActiveNote();
  }
  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    createNote();
  }
});

$('.gallery-mode-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-gallery-mode]');
  if (!button) return;
  currentGalleryMode = button.dataset.galleryMode;
  renderGallery();
});

$('#galleryBoardFilters').addEventListener('click', event => {
  const button = event.target.closest('[data-gallery-board-filter]');
  if (!button) return;
  currentGalleryBoard = button.dataset.galleryBoardFilter;
  renderGallery();
});

$('#galleryBoards').addEventListener('click', event => {
  const board = event.target.closest('[data-gallery-board]');
  if (!board) return;
  currentGalleryBoard = board.dataset.galleryBoard;
  currentGalleryMode = 'pins';
  renderGallery();
});

function galleryDropTitle(url, fallback = '') {
  if (fallback.trim()) return fallback.trim().slice(0, 36);
  try {
    const segment = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || '网页图片');
    return segment.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').slice(0, 36) || '网页图片';
  } catch { return '网页图片'; }
}

function galleryBlobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function readGalleryImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 2200;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let compressed = null;
  for (const quality of [.86, .76, .66]) {
    compressed = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (compressed && compressed.size <= 1.8 * 1024 * 1024) break;
  }
  if (!compressed) throw new Error('当前浏览器无法处理这张图片');
  return galleryBlobToDataUrl(compressed);
}

async function galleryItemFromDrop(dataTransfer) {
  const imageFile = [...dataTransfer.files].find(file => file.type.startsWith('image/'));
  if (imageFile) {
    if (imageFile.size > 12 * 1024 * 1024) throw new Error('图片文件请控制在 12MB 以内');
    return { image: await readGalleryImageFile(imageFile), title: galleryDropTitle(imageFile.name), source: '' };
  }

  const html = dataTransfer.getData('text/html');
  if (html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const image = parsed.querySelector('img');
    if (image?.src) {
      const sourceLink = image.closest('a')?.href || parsed.querySelector('a')?.href || '';
      return { image: image.src, title: galleryDropTitle(image.src, image.alt || image.title || ''), source: sourceLink };
    }
  }

  const uri = dataTransfer.getData('text/uri-list').split('\n').map(value => value.trim()).find(value => value && !value.startsWith('#'))
    || dataTransfer.getData('text/plain').trim();
  if (/^https?:\/\//i.test(uri) || /^data:image\//i.test(uri)) return { image: uri, title: galleryDropTitle(uri), source: '' };
  throw new Error('没有识别到可收藏的图片');
}

function acceptsGalleryDrop(dataTransfer) {
  const types = [...(dataTransfer?.types || [])];
  return types.some(type => ['Files', 'text/html', 'text/uri-list', 'text/plain'].includes(type));
}

function acceptsBookmarkDrop(dataTransfer) {
  const types = [...(dataTransfer?.types || [])];
  return types.some(type => ['text/html', 'text/uri-list', 'text/plain', 'text/x-moz-url'].includes(type));
}

function normalizeDroppedWebsiteUrl(value) {
  const candidate = String(value || '').split(/\r?\n/).map(part => part.trim()).find(part => /^https?:\/\//i.test(part));
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return '';
  }
}

function websiteFromDrop(dataTransfer) {
  const html = dataTransfer.getData('text/html');
  if (html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const anchor = parsed.querySelector('a[href]');
    const url = normalizeDroppedWebsiteUrl(anchor?.href);
    if (url) {
      const name = anchor.getAttribute('title')?.trim() || anchor.textContent?.trim() || parsed.title?.trim();
      return { url, name };
    }
  }

  const mozValue = dataTransfer.getData('text/x-moz-url');
  const mozParts = mozValue.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  const uriValue = dataTransfer.getData('text/uri-list').split(/\r?\n/).map(value => value.trim()).find(value => value && !value.startsWith('#'));
  const plainValue = dataTransfer.getData('text/plain').trim();
  const url = normalizeDroppedWebsiteUrl(mozParts[0] || uriValue || plainValue);
  if (!url) throw new Error('没有识别到有效的网址');
  return { url, name: mozParts[1] || '' };
}

function bookmarkDropCategory(event) {
  const tab = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-category]');
  const categoryId = tab?.dataset.category || currentCategory;
  if (categoryId !== 'all') return categoryId;
  return 'all';
}

function bookmarkDropTargetLabel(event) {
  const tab = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-category]');
  const categoryId = tab?.dataset.category || currentCategory;
  return allCategories().find(category => category.id === categoryId)?.name || '全部导航';
}

function clearBookmarkDropState() {
  bookmarkDragDepth = 0;
  document.body.classList.remove('bookmarks-drag-active');
  $$('.category-tabs .bookmark-drop-target').forEach(tab => tab.classList.remove('bookmark-drop-target'));
}

function updateBookmarkDropTarget(event) {
  const tab = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-category]');
  $$('.category-tabs .bookmark-drop-target').forEach(item => item.classList.toggle('bookmark-drop-target', item === tab));
  $('#bookmarkDropTitle').textContent = `导入到「${bookmarkDropTargetLabel(event)}」`;
}

let bookmarkDragDepth = 0;
document.addEventListener('dragenter', event => {
  if ($('#bookmarksView').hidden || document.querySelector('dialog[open]') || !acceptsBookmarkDrop(event.dataTransfer)) return;
  event.preventDefault();
  bookmarkDragDepth += 1;
  document.body.classList.add('bookmarks-drag-active');
  updateBookmarkDropTarget(event);
});
document.addEventListener('dragover', event => {
  if ($('#bookmarksView').hidden || document.querySelector('dialog[open]') || !acceptsBookmarkDrop(event.dataTransfer)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  updateBookmarkDropTarget(event);
});
document.addEventListener('dragleave', event => {
  if (!document.body.classList.contains('bookmarks-drag-active')) return;
  bookmarkDragDepth = Math.max(0, bookmarkDragDepth - 1);
  if (bookmarkDragDepth === 0) clearBookmarkDropState();
});
document.addEventListener('drop', event => {
  if ($('#bookmarksView').hidden || document.querySelector('dialog[open]') || !acceptsBookmarkDrop(event.dataTransfer)) return;
  event.preventDefault();
  const category = bookmarkDropCategory(event);
  clearBookmarkDropState();
  try {
    const dropped = websiteFromDrop(event.dataTransfer);
    const normalized = new URL(dropped.url);
    const duplicate = allSites().find(site => {
      try { return new URL(site.url).href.replace(/\/$/, '') === normalized.href.replace(/\/$/, ''); }
      catch { return false; }
    });
    if (duplicate) {
      showToast(`「${duplicate.name}」已经在书签中`);
      return;
    }

    const hostname = normalized.hostname.replace(/^www\./, '');
    const name = String(dropped.name || '').replace(/\s+/g, ' ').trim().slice(0, 36) || hostname.split('.')[0] || '新网站';
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    customSites.push({
      id,
      name,
      url: normalized.href,
      desc: hostname,
      category,
      color: ['#7c6cf2', '#e56788', '#37a986', '#dd8b45'][customSites.length % 4],
      icon: name.slice(0, 1).toUpperCase(),
      custom: true
    });
    siteOrder.push(id);
    store.set('mos-custom-sites', customSites);
    store.set('mos-site-order', siteOrder);
    renderSites();
    showToast(`已导入「${name}」`);
  } catch (error) {
    showToast(error.message || '网站导入失败');
  }
});

let galleryDragDepth = 0;
document.addEventListener('dragenter', event => {
  if ($('#galleryView').hidden || document.querySelector('dialog[open]') || !acceptsGalleryDrop(event.dataTransfer)) return;
  event.preventDefault();
  galleryDragDepth += 1;
  $('#galleryView').classList.add('is-drag-over');
});
document.addEventListener('dragover', event => {
  if ($('#galleryView').hidden || document.querySelector('dialog[open]') || !acceptsGalleryDrop(event.dataTransfer)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});
document.addEventListener('dragleave', () => {
  if (galleryDragDepth > 0) galleryDragDepth -= 1;
  if (galleryDragDepth === 0) $('#galleryView').classList.remove('is-drag-over');
});
document.addEventListener('drop', async event => {
  if ($('#galleryView').hidden || document.querySelector('dialog[open]') || !acceptsGalleryDrop(event.dataTransfer)) return;
  event.preventDefault();
  galleryDragDepth = 0;
  $('#galleryView').classList.remove('is-drag-over');
  try {
    const dropped = await galleryItemFromDrop(event.dataTransfer);
    const item = {
      id: `gallery-${Date.now()}`,
      image: dropped.image,
      title: dropped.title,
      board: currentGalleryBoard === '全部' ? '网页收藏' : currentGalleryBoard,
      source: dropped.source
    };
    galleryItems.unshift(item);
    currentGalleryBoard = item.board;
    currentGalleryMode = 'pins';
    try { store.set('mos-gallery-items', galleryItems); }
    catch {
      galleryItems.shift();
      throw new Error('图片较大，浏览器本地空间不足');
    }
    renderGallery();
    showToast(`已收藏到「${item.board}」`);
  } catch (error) {
    showToast(error.message || '图片收藏失败');
  }
});

const galleryLightbox = $('#galleryLightbox');
function renderGalleryLightbox() {
  const item = galleryItems.find(entry => entry.id === activeGalleryItemId);
  if (!item) return;
  $('#galleryLightboxImage').src = item.image;
  $('#galleryLightboxImage').alt = item.title;
  $('#galleryLightboxTitle').textContent = item.title;
  $('#galleryLightboxBoard').textContent = item.board;
  $('#galleryLightboxSource').href = item.source || item.image;
  const singleItem = galleryItems.length < 2;
  $('#galleryLightboxPrev').hidden = singleItem;
  $('#galleryLightboxNext').hidden = singleItem;
}

function openGalleryLightbox(itemId) {
  activeGalleryItemId = itemId;
  renderGalleryLightbox();
  if (!galleryLightbox.open) galleryLightbox.showModal();
}

function moveGalleryLightbox(direction) {
  const index = galleryItems.findIndex(item => item.id === activeGalleryItemId);
  if (index < 0 || galleryItems.length < 2) return;
  activeGalleryItemId = galleryItems[(index + direction + galleryItems.length) % galleryItems.length].id;
  renderGalleryLightbox();
}

$('#galleryGrid').addEventListener('click', event => {
  const preview = event.target.closest('[data-gallery-preview]');
  if (preview) {
    openGalleryLightbox(preview.dataset.galleryPreview);
    return;
  }
  const remove = event.target.closest('[data-gallery-remove]');
  if (!remove) return;
  event.preventDefault();
  const index = galleryItems.findIndex(item => item.id === remove.dataset.galleryRemove);
  if (index < 0) return;
  const [removedItem] = galleryItems.splice(index, 1);
  store.set('mos-gallery-items', galleryItems);
  renderGallery();
  showToast('图片已移出图库', {
    duration: 6000,
    actionLabel: '撤销',
    onAction: () => {
      galleryItems.splice(index, 0, removedItem);
      store.set('mos-gallery-items', galleryItems);
      renderGallery();
      showToast('已恢复图片');
    }
  });
});

$('#closeGalleryLightbox').addEventListener('click', () => galleryLightbox.close());
$('#galleryLightboxPrev').addEventListener('click', () => moveGalleryLightbox(-1));
$('#galleryLightboxNext').addEventListener('click', () => moveGalleryLightbox(1));
galleryLightbox.addEventListener('click', event => { if (event.target === galleryLightbox) galleryLightbox.close(); });
galleryLightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveGalleryLightbox(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveGalleryLightbox(1); }
});

$('#galleryGrid').addEventListener('error', event => {
  if (event.target.matches('img')) {
    event.target.closest('.gallery-pin-media')?.classList.add('image-error');
    requestAnimationFrame(layoutGalleryMasonry);
  }
}, true);

let galleryResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(galleryResizeTimer);
  galleryResizeTimer = setTimeout(layoutGalleryMasonry, 100);
});

const galleryAddDialog = $('#galleryAddDialog');
$('#openGalleryAdd').addEventListener('click', () => {
  const form = $('#galleryAddForm');
  form.reset();
  form.elements.board.value = currentGalleryBoard === '全部' ? (galleryBoards()[0] || '灵感收藏') : currentGalleryBoard;
  galleryAddDialog.showModal();
  requestAnimationFrame(() => form.elements.image.focus());
});
$('#closeGalleryAdd').addEventListener('click', () => galleryAddDialog.close());
$('#cancelGalleryAdd').addEventListener('click', () => galleryAddDialog.close());
galleryAddDialog.addEventListener('click', event => { if (event.target === galleryAddDialog) galleryAddDialog.close(); });
$('#galleryAddForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const item = {
    id: `gallery-${Date.now()}`,
    image: data.get('image').trim(),
    title: data.get('title').trim(),
    board: data.get('board').trim(),
    source: data.get('source').trim()
  };
  galleryItems.unshift(item);
  currentGalleryBoard = item.board;
  currentGalleryMode = 'pins';
  store.set('mos-gallery-items', galleryItems);
  galleryAddDialog.close();
  renderGallery();
  showToast('已收藏到图库');
});

const searchDialog = $('#searchDialog');
let searchCloseTimer = null;
function openSearchDialog() {
  clearTimeout(searchCloseTimer);
  searchDialog.classList.remove('is-closing');
  if (!searchDialog.open) searchDialog.showModal();
  requestAnimationFrame(() => {
    $('#searchInput').focus();
    $('#searchInput').select();
  });
}

function closeSearchDialog() {
  if (!searchDialog.open || searchDialog.classList.contains('is-closing')) return;
  searchDialog.classList.add('is-closing');
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
  searchCloseTimer = setTimeout(() => {
    searchDialog.close();
    searchDialog.classList.remove('is-closing');
  }, duration);
}

$('#openSearch').addEventListener('click', openSearchDialog);
$('#closeSearch').addEventListener('click', closeSearchDialog);
searchDialog.addEventListener('click', event => {
  if (event.target === searchDialog) closeSearchDialog();
});
searchDialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeSearchDialog();
});
searchDialog.addEventListener('close', () => { $('#engineMenu').hidden = true; });

$('#searchForm').addEventListener('submit', event => { event.preventDefault(); doSearch($('#searchInput').value); });
$('#searchInput').addEventListener('input', event => {
  searchQuery = event.target.value;
  renderSites();
});
$('.quick-searches').addEventListener('click', event => { if (event.target.dataset.query) doSearch(event.target.dataset.query); });
$('#engineButton').addEventListener('click', () => { $('#engineMenu').hidden = !$('#engineMenu').hidden; });
$('#engineMenu').addEventListener('click', event => {
  const button = event.target.closest('[data-engine]');
  if (!button) return;
  currentEngine = engines.find(engine => engine.name === button.dataset.engine);
  renderCurrentEngine();
  $('#engineMenu').hidden = true;
});
$('.engine-select').addEventListener('error', event => {
  if (!event.target.matches('img')) return;
  event.target.parentElement.classList.add('fallback');
}, true);
document.addEventListener('click', event => { if (!event.target.closest('.engine-select')) $('#engineMenu').hidden = true; });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); openSearchDialog(); }
});

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  store.set('mos-light-theme', isLight);
  $$('[data-theme]').forEach(button => {
    const active = button.dataset.theme === theme;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function initDirectionalTopbar() {
  const topbar = $('.topbar');
  let ticking = false;

  const update = () => {
    const currentScrollY = Math.max(window.scrollY, 0);
    topbar.classList.toggle('is-scrolled', currentScrollY > 8);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

$('.theme-options').addEventListener('click', event => {
  const button = event.target.closest('[data-theme]');
  if (!button) return;
  applyTheme(button.dataset.theme);
});

const splashCursorProps = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 3.5,
  VELOCITY_DISSIPATION: 2,
  PRESSURE: .1,
  PRESSURE_ITERATIONS: 20,
  CURL: 3,
  SPLAT_RADIUS: .2,
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLOR_UPDATE_SPEED: 10,
  RAINBOW_MODE: false,
  COLOR: '#6ea8fe',
  TRANSPARENT: true
};

function setSplashCursorEnabled(enabled, { notify = false } = {}) {
  splashCursorEnabled = enabled;
  store.set('mos-splash-cursor-enabled', enabled);
  if (enabled && !splashCursorApp) {
    splashCursorApp = createApp(SplashCursor, splashCursorProps);
    splashCursorApp.mount('#splashCursorMount');
  } else if (!enabled && splashCursorApp) {
    splashCursorApp.unmount();
    splashCursorApp = null;
  }
  const toggle = $('#splashCursorToggle');
  toggle.setAttribute('aria-checked', String(enabled));
  toggle.setAttribute('aria-label', `${enabled ? '关闭' : '打开'}鼠标流体效果`);
  if (notify) showToast(`鼠标流体效果已${enabled ? '打开' : '关闭'}`);
}

$('#splashCursorToggle').addEventListener('click', () => {
  setSplashCursorEnabled(!splashCursorEnabled, { notify: true });
});

const dialog = $('#addDialog');
function openSiteDialog() {
  renderCategoryOptions();
  const select = $('#addForm select[name="category"]');
  if (currentCategory !== 'all' && [...select.options].some(option => option.value === currentCategory)) {
    select.value = currentCategory;
  }
  dialog.showModal();
}

$('#closeDialog').addEventListener('click', () => dialog.close());
$('#cancelAdd').addEventListener('click', () => dialog.close());
$('#confirmAdd').addEventListener('click', event => {
  event.preventDefault();
  const form = $('#addForm');
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const name = data.get('name').trim();
  const category = data.get('category');
  const id = `custom-${Date.now()}`;
  customSites.push({
    id,
    name,
    url: data.get('url').trim(),
    desc: '我的自定义快捷入口',
    category,
    color: ['#7c6cf2', '#e56788', '#37a986', '#dd8b45'][customSites.length % 4],
    icon: name.slice(0, 1).toUpperCase(),
    custom: true
  });
  siteOrder.push(id);
  store.set('mos-custom-sites', customSites);
  store.set('mos-site-order', siteOrder);
  form.reset();
  dialog.close();
  currentCategory = category;
  renderSites();
  showToast('网址已添加');
});

const categoryDialog = $('#categoryDialog');
$('#closeCategoryDialog').addEventListener('click', () => categoryDialog.close());
$('#cancelCategory').addEventListener('click', () => categoryDialog.close());
$('#confirmCategory').addEventListener('click', () => {
  const form = $('#categoryForm');
  if (!form.reportValidity()) return;
  const name = new FormData(form).get('categoryName').trim();
  if (allCategories().some(category => category.name.toLowerCase() === name.toLowerCase())) {
    showToast('这个分类已经存在');
    return;
  }
  const category = { id: `category-${Date.now()}`, name, icon: name.slice(0, 1), custom: true };
  customCategories.push(category);
  store.set('mos-custom-categories', customCategories);
  currentCategory = category.id;
  form.reset();
  categoryDialog.close();
  renderCategoryOptions();
  renderSites();
  showToast('新分类已创建');
});

const groupDialog = $('#groupDialog');
const groupDialogSites = $('#groupDialogSites');
const groupDragEffect = createDragSortEffect({ container: groupDialogSites, itemSelector: '.group-sort-item' });
let groupPointerDrag = null;
let suppressGroupClick = false;

function beginGroupExitDrag() {
  if (!groupPointerDrag || groupPointerDrag.exited) return;
  const group = findGroup(groupPointerDrag.groupId);
  if (!group) return;

  if (groupPointerDrag.nestedGroupId) {
    const nestedGroup = findGroup(groupPointerDrag.nestedGroupId);
    if (!nestedGroup || nestedGroup.parentId !== group.id) return;
    nestedGroup.parentId = null;
  } else {
    group.siteIds = group.siteIds.filter(id => id !== groupPointerDrag.siteId);
  }

  if (collectGroupSiteIds(group.id).length < 2) {
    const parent = findGroup(group.parentId);
    if (parent) group.siteIds.forEach(id => { if (!parent.siteIds.includes(id)) parent.siteIds.push(id); });
    childGroups(group.id).forEach(child => { child.parentId = parent?.id ?? null; });
    siteGroups = siteGroups.filter(entry => entry.id !== group.id);
  }
  groupPointerDrag.exited = true;
  groupPointerDrag.lastTarget = null;
  groupDragEffect.movePortal(document.body);
  closeGroupDialog({ immediate: true });
  renderSites();

  const externalCard = [...siteGrid.querySelectorAll(sortableSiteSelector)]
    .find(card => groupPointerDrag.nestedGroupId
      ? card.dataset.groupId === groupPointerDrag.nestedGroupId
      : card.dataset.id === groupPointerDrag.siteId);
  groupPointerDrag.externalCard = externalCard ?? null;
  externalCard?.classList.add('sort-dragging');
}

function updateGroupExitPosition(event) {
  const dragState = groupPointerDrag;
  const source = dragState?.externalCard;
  if (!source) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(sortableSiteSelector);
  if (!target || target === source || target.parentElement !== siteGrid) {
    dragState.dropTarget?.classList.remove('reorder-target', 'drop-after');
    dragState.dropTarget = null;
    dragState.lastTarget = null;
    return;
  }

  const items = [...siteGrid.querySelectorAll(sortableSiteSelector)];
  const sourceIndex = items.indexOf(source);
  const targetIndex = items.indexOf(target);
  const placeAfter = sourceIndex < targetIndex;
  if (dragState.dropTarget !== target) dragState.dropTarget?.classList.remove('reorder-target', 'drop-after');
  dragState.dropTarget = target;
  target.classList.add('reorder-target');
  target.classList.toggle('drop-after', placeAfter);
  if (dragState.lastTarget === target) return;
  dragState.lastTarget = target;

  const beforeRects = new Map(items.map(item => [item, item.getBoundingClientRect()]));
  siteGrid.insertBefore(source, placeAfter ? target.nextSibling : target);
  siteDragEffect.reflow(beforeRects, source);
}

function cancelNestedGroupTarget() {
  if (!groupPointerDrag) return;
  clearTimeout(groupPointerDrag.groupTimer);
  groupPointerDrag.groupTimer = null;
  groupPointerDrag.groupCandidate = null;
  groupPointerDrag.groupTarget?.classList.remove('group-target');
  groupPointerDrag.groupTarget = null;
}

function scheduleNestedGroupTarget(target) {
  if (groupPointerDrag.groupCandidate === target) return;
  cancelNestedGroupTarget();
  groupPointerDrag.groupCandidate = target;
  groupPointerDrag.groupTimer = setTimeout(() => {
    if (!groupPointerDrag || groupPointerDrag.groupCandidate !== target) return;
    groupPointerDrag.groupTarget = target;
    target.classList.add('group-target');
  }, 700);
}

groupDialogSites.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  const item = event.target.closest('.group-sort-item');
  if (!item?.dataset.siteId && !item?.dataset.nestedGroupId) return;
  groupPointerDrag = {
    pointerId: event.pointerId,
    item,
    siteId: item.dataset.siteId,
    nestedGroupId: item.dataset.nestedGroupId,
    groupId: activeGroupId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    lastTarget: null,
    dropTarget: null,
    externalCard: null,
    exited: false,
    groupCandidate: null,
    groupTarget: null,
    groupTimer: null
  };
});

function handleGroupPointerMove(event) {
  if (!groupPointerDrag || event.pointerId !== groupPointerDrag.pointerId) return;
  const distance = Math.hypot(event.clientX - groupPointerDrag.startX, event.clientY - groupPointerDrag.startY);
  if (!groupPointerDrag.moved && distance < 5) return;

  if (!groupPointerDrag.moved) {
    groupPointerDrag.moved = true;
    suppressGroupClick = true;
    groupDragEffect.start(groupPointerDrag.item, event);
  }

  event.preventDefault();
  groupDragEffect.move(event);

  if (!groupPointerDrag.exited) {
    const dialogRect = groupDialog.querySelector('.group-dialog-content').getBoundingClientRect();
    const outsideDialog = event.clientX < dialogRect.left || event.clientX > dialogRect.right || event.clientY < dialogRect.top || event.clientY > dialogRect.bottom;
    if (outsideDialog) beginGroupExitDrag();
  }
  if (groupPointerDrag.exited) {
    updateGroupExitPosition(event);
    return;
  }

  if (groupPointerDrag.nestedGroupId) {
    cancelNestedGroupTarget();
    groupPointerDrag.lastTarget = null;
    return;
  }

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.group-sort-item');
  if (!target || target === groupPointerDrag.item || target.parentElement !== groupDialogSites) {
    cancelNestedGroupTarget();
    groupPointerDrag.lastTarget = null;
    return;
  }
  if (groupPointerDrag.groupTarget === target) return;
  const targetRect = target.getBoundingClientRect();
  const inGroupZone = Math.abs(event.clientX - (targetRect.left + targetRect.width / 2)) < targetRect.width * .3
    && Math.abs(event.clientY - (targetRect.top + targetRect.height / 2)) < targetRect.height * .36;
  if (inGroupZone) scheduleNestedGroupTarget(target);
  else cancelNestedGroupTarget();
  if (target.dataset.nestedGroupId) return;
  if (groupPointerDrag.lastTarget === target) return;
  groupPointerDrag.lastTarget = target;

  const items = [...groupDialogSites.querySelectorAll('.group-sort-item')];
  const sourceIndex = items.indexOf(groupPointerDrag.item);
  const targetIndex = items.indexOf(target);
  const beforeRects = new Map(items.map(item => [item, item.getBoundingClientRect()]));
  groupDialogSites.insertBefore(groupPointerDrag.item, sourceIndex < targetIndex ? target.nextSibling : target);
  groupDragEffect.reflow(beforeRects, groupPointerDrag.item);
}

function finishGroupPointerDrag(event) {
  if (!groupPointerDrag || event.pointerId !== groupPointerDrag.pointerId) return;
  const dragState = groupPointerDrag;
  const { moved, exited, externalCard, groupTarget, siteId, nestedGroupId, groupId } = dragState;
  groupPointerDrag = null;

  clearTimeout(dragState.groupTimer);
  groupTarget?.classList.remove('group-target');
  dragState.dropTarget?.classList.remove('reorder-target', 'drop-after');
  if (exited) {
    groupDragEffect.finish({ settle: false });
    externalCard?.classList.remove('sort-dragging');
    saveVisibleSiteOrder();
    persistGroups();
    activeGroupId = null;
    renderSites();
    showToast(nestedGroupId ? '子分组已移到外部' : '已移出分组并保存位置');
    setTimeout(() => { suppressGroupClick = false; }, 0);
    return;
  }

  if (nestedGroupId) {
    groupDragEffect.finish({ settle: moved });
    setTimeout(() => { suppressGroupClick = false; }, 0);
    return;
  }

  if (moved && groupTarget) {
    groupDragEffect.finish({ settle: false });
    const parent = findGroup(groupId);
    if (parent) {
      parent.siteIds = parent.siteIds.filter(id => id !== siteId);
      if (groupTarget.dataset.nestedGroupId) {
        const targetGroup = findGroup(groupTarget.dataset.nestedGroupId);
        if (targetGroup && !targetGroup.siteIds.includes(siteId)) targetGroup.siteIds.push(siteId);
        showToast('已加入子分组');
      } else {
        const targetId = groupTarget.dataset.siteId;
        parent.siteIds = parent.siteIds.filter(id => id !== targetId);
        let name = '新分组';
        let suffix = 2;
        while (siteGroups.some(group => group.name === name)) name = `新分组 ${suffix++}`;
        siteGroups.push({ id: `group-${Date.now()}`, name, siteIds: [targetId, siteId], parentId: parent.id });
        showToast('已创建子分组');
      }
      persistGroups();
      renderSites();
      openGroupDialog(parent.id);
    }
    setTimeout(() => { suppressGroupClick = false; }, 0);
    return;
  }

  groupDragEffect.finish({ settle: moved });

  if (moved) {
    const group = siteGroups.find(entry => entry.id === activeGroupId);
    if (group) {
      group.siteIds = [...groupDialogSites.querySelectorAll('.group-sort-item[data-site-id]')].map(entry => entry.dataset.siteId);
      persistGroups();
      renderSites();
      showToast('组内排序已保存');
    }
  }
  setTimeout(() => { suppressGroupClick = false; }, 0);
}

window.addEventListener('pointermove', handleGroupPointerMove);
window.addEventListener('pointerup', finishGroupPointerDrag);
window.addEventListener('pointercancel', finishGroupPointerDrag);
groupDialogSites.addEventListener('click', event => {
  if (suppressGroupClick) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const nestedGroup = event.target.closest('[data-nested-group-id]');
  if (!nestedGroup) return;
  event.preventDefault();
  openGroupDialog(nestedGroup.dataset.nestedGroupId, nestedGroup);
}, true);

$('#closeGroupDialog').addEventListener('click', () => closeGroupDialog());
$('#finishGroup').addEventListener('click', () => closeGroupDialog());

function navigateUpFromActiveGroup() {
  const group = findGroup(activeGroupId);
  if (group?.parentId) playNestedGroupClose(group.parentId, group.id);
  else closeGroupDialog();
}

groupDialog.addEventListener('click', event => {
  if (event.target.closest('.group-sort-item, .dialog-heading, .dialog-actions')) return;
  navigateUpFromActiveGroup();
});
groupDialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeGroupDialog();
});
$('#groupBackButton').addEventListener('click', () => {
  navigateUpFromActiveGroup();
});
$('#groupNameInput').addEventListener('input', event => {
  const group = findGroup(activeGroupId);
  const name = event.target.value.trim();
  if (!group || !name) return;
  group.name = name;
  persistGroups();
  renderSites();
});
$('#groupNameInput').addEventListener('blur', event => {
  const group = findGroup(activeGroupId);
  if (!group) return;
  if (!event.target.value.trim()) event.target.value = group.name;
});
$('#ungroupSites').addEventListener('click', () => {
  if (!activeGroupId) return;
  const group = findGroup(activeGroupId);
  if (!group) return;
  if (group.parentId) {
    const parent = findGroup(group.parentId);
    if (parent) parent.siteIds.push(...group.siteIds.filter(id => !parent.siteIds.includes(id)));
    childGroups(group.id).forEach(child => { child.parentId = group.parentId; });
    siteGroups = siteGroups.filter(entry => entry.id !== group.id);
    persistGroups();
    renderSites();
    openGroupDialog(group.parentId);
    showToast('子分组已解散');
    return;
  }
  const removedIds = new Set(collectGroupIds(group.id));
  siteGroups = siteGroups.filter(entry => !removedIds.has(entry.id));
  persistGroups();
  activeGroupId = null;
  closeGroupDialog();
  renderSites();
  showToast('分组已解散');
});

const authDialog = $('#authDialog');

function userInitials(user) {
  const source = user?.user_metadata?.full_name || user?.name || user?.email || 'MO';
  return source.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'MO';
}

function renderAuthState() {
  const signedIn = Boolean(currentUser);
  const isWechat = currentUser?.provider === 'wechat';
  const accountLabel = isWechat ? '微信账号' : currentUser?.email || '尚未登录';
  if (signedIn && currentUser.email) store.set('mos-last-login-email', currentUser.email);
  $('#authGuestView').hidden = signedIn;
  $('#authUserView').hidden = !signedIn;
  $('#authTitle').textContent = signedIn ? '我的账号' : authMode === 'login' ? '邮箱登录' : '创建账号';
  const initials = userInitials(currentUser);
  $('#avatarText').textContent = signedIn ? initials : 'MO';
  $('#accountButton').classList.toggle('is-signed-in', signedIn);
  $('#accountButton').setAttribute('aria-label', signedIn ? `打开账户菜单：${accountLabel}` : '打开账户菜单');
  $('#accountButton').title = signedIn ? accountLabel : '账户与设置';
  $('#accountMenuAvatar').textContent = signedIn ? initials : 'MO';
  $('#accountMenuAvatar').classList.toggle('is-signed-in', signedIn);
  $('#accountMenuName').textContent = signedIn ? (currentUser.user_metadata?.full_name || currentUser.name || currentUser.email?.split('@')[0] || '我的账号') : '访客模式';
  $('#accountMenuEmail').textContent = signedIn ? accountLabel : '尚未登录';
  $('#accountMenuLogin').hidden = signedIn;
  $('#accountMenuLogout').hidden = !signedIn;
  if (signedIn) {
    $('#authUserAvatar').textContent = initials;
    $('#authUserEmail').textContent = accountLabel;
  }
}

function renderAuthMode() {
  const signingUp = authMode === 'signup';
  $('#authTitle').textContent = signingUp ? '创建账号' : '邮箱登录';
  $('#authSubmit').textContent = signingUp ? '创建账号' : '登录';
  $('#authSwitchHint').textContent = signingUp ? '已经有账号？' : '还没有账号？';
  $('#authSwitchMode').textContent = signingUp ? '返回登录' : '创建账号';
  $('#savedCredentialLogin').hidden = signingUp;
  $('#authEmail').autocomplete = signingUp ? 'email' : 'username';
  $('#authPassword').autocomplete = signingUp ? 'new-password' : 'current-password';
  $('#authMessage').textContent = '';
  $('#authMessage').className = 'auth-message';
}

function maskEmail(email) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${name.length > 2 ? '***' : ''}@${domain}`;
}

function prefillRememberedEmail() {
  const rememberedEmail = store.get('mos-last-login-email', '');
  if (rememberedEmail && !$('#authEmail').value) $('#authEmail').value = rememberedEmail;
  $('#savedCredentialText').textContent = rememberedEmail
    ? `使用 ${maskEmail(rememberedEmail)} 一键登录`
    : '使用已保存账号一键登录';
}

async function rememberSuccessfulCredential(email, password) {
  store.set('mos-last-login-email', email);
  prefillRememberedEmail();
  if (!window.PasswordCredential || !navigator.credentials?.store) return;
  try {
    const credential = new PasswordCredential({ id: email, password, name: email });
    await navigator.credentials.store(credential);
  } catch {
    // The browser may decline or not support storing password credentials.
  }
}

function setAuthMessage(message, type = 'error') {
  const node = $('#authMessage');
  node.textContent = message;
  node.className = `auth-message ${type}`;
}

function readableAuthError(error) {
  if (error?.status === 404 || error?.message === 'Not Found') return '邮箱登录需部署到 Netlify，并在项目中启用 Identity。';
  if (error instanceof MissingIdentityError) return '邮箱登录需部署到 Netlify，并在项目中启用 Identity。';
  if (error instanceof AuthError) {
    if (error.status === 401) return '邮箱或密码不正确。';
    if (error.status === 403) return '当前项目暂未开放邮箱注册。';
    if (error.status === 404) return '邮箱登录需部署到 Netlify，并在项目中启用 Identity。';
    if (error.status === 422) return '请检查邮箱格式，密码至少需要 6 位。';
    return error.message;
  }
  return '暂时无法完成操作，请稍后重试。';
}

function closeAccountMenu() {
  $('.account-control').classList.remove('is-open');
  $('#accountButton').setAttribute('aria-expanded', 'false');
}

function openAuthDialog() {
  renderAuthState();
  if (!currentUser) {
    renderAuthMode();
    prefillRememberedEmail();
  }
  authDialog.showModal();
}

$('#accountButton').addEventListener('click', event => {
  event.stopPropagation();
  renderAuthState();
  const control = $('.account-control');
  const open = !control.classList.contains('is-open');
  control.classList.toggle('is-open', open);
  $('#accountButton').setAttribute('aria-expanded', String(open));
});
$('#accountMenuLogin').addEventListener('click', () => {
  closeAccountMenu();
  openAuthDialog();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.account-control')) closeAccountMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeAccountMenu();
});
$('#closeAuthDialog').addEventListener('click', () => authDialog.close());
$('#authSwitchMode').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'signup' : 'login';
  renderAuthMode();
});
$('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const submit = $('#authSubmit');
  submit.disabled = true;
  submit.textContent = authMode === 'login' ? '登录中…' : '创建中…';
  setAuthMessage('');
  try {
    if (authMode === 'login') {
      currentUser = await login(email, password);
      await rememberSuccessfulCredential(email, password);
      renderAuthState();
      authDialog.close();
      showToast('登录成功');
    } else {
      const user = await signup(email, password, { full_name: email.split('@')[0] });
      if (user.emailVerified) {
        currentUser = user;
        await rememberSuccessfulCredential(email, password);
        renderAuthState();
        authDialog.close();
        showToast('账号创建成功');
      } else {
        setAuthMessage('注册成功，请前往邮箱完成验证。', 'success');
      }
    }
  } catch (error) {
    setAuthMessage(readableAuthError(error));
  } finally {
    submit.disabled = false;
    submit.textContent = authMode === 'login' ? '登录' : '创建账号';
  }
});
$('#wechatLogin').addEventListener('click', () => {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    setAuthMessage('微信扫码登录需要部署到 Netlify，并配置微信开放平台参数。');
    return;
  }
  location.assign('/api/auth/wechat/start');
});
$('#savedCredentialLogin').addEventListener('click', async () => {
  if (!window.PasswordCredential || !navigator.credentials?.get) {
    setAuthMessage('当前浏览器不支持一键读取，请点击邮箱输入框使用密码管理器自动填充。');
    $('#authEmail').focus();
    return;
  }
  const button = $('#savedCredentialLogin');
  button.disabled = true;
  setAuthMessage('', '');
  try {
    const credential = await navigator.credentials.get({ password: true, mediation: 'required' });
    if (!credential || credential.type !== 'password') {
      setAuthMessage('没有选择已保存账号，你仍可使用下方邮箱密码登录。');
      return;
    }
    $('#authEmail').value = credential.id;
    $('#authPassword').value = credential.password;
    currentUser = await login(credential.id, credential.password);
    await rememberSuccessfulCredential(credential.id, credential.password);
    renderAuthState();
    authDialog.close();
    showToast('登录成功');
  } catch (error) {
    if (error?.name === 'NotAllowedError') setAuthMessage('已取消选择账号。');
    else setAuthMessage(readableAuthError(error));
  } finally {
    button.disabled = false;
  }
});
async function performLogout() {
  try {
    if (currentUser?.provider === 'wechat') {
      const response = await fetch('/api/auth/wechat/logout', { method: 'POST' });
      if (!response.ok) throw new Error('微信退出登录失败');
    } else {
      await logout();
    }
    currentUser = null;
    renderAuthState();
    authDialog.close();
    closeAccountMenu();
    showToast('已退出登录');
  } catch (error) {
    showToast(readableAuthError(error));
  }
}

$('#authLogout').addEventListener('click', performLogout);
$('#accountMenuLogout').addEventListener('click', performLogout);

async function initializeAuth() {
  try {
    const wechatStatus = new URLSearchParams(location.search).get('wechat_login');
    const wechatResponse = await fetch('/api/auth/wechat/session', { headers: { Accept: 'application/json' } }).catch(() => null);
    if (wechatResponse?.ok) {
      const session = await wechatResponse.json();
      if (session.user) currentUser = session.user;
    }
    const callback = await handleAuthCallback();
    if (callback?.user) {
      currentUser = callback.user;
      showToast(callback.type === 'confirmation' ? '邮箱验证成功' : '登录成功');
    } else if (!currentUser) {
      currentUser = await getUser();
    }
    if (wechatStatus) {
      const messages = {
        success: '微信登录成功',
        config: '微信登录尚未完成开放平台配置',
        state: '微信登录状态已过期，请重新扫码',
        denied: '微信授权未完成',
        profile: '暂时无法读取微信账号信息',
        network: '微信登录网络异常，请稍后重试'
      };
      showToast(messages[wechatStatus] || '微信登录未完成');
      history.replaceState({}, '', `${location.pathname}${location.hash}`);
    }
  } catch (error) {
    if (!(error instanceof MissingIdentityError)) showToast(readableAuthError(error));
  }
  renderAuthState();
  onAuthChange((_event, user) => {
    if (currentUser?.provider === 'wechat' && !user) return;
    currentUser = user;
    renderAuthState();
  });
}

applyTheme(store.get('mos-light-theme', false) ? 'light' : 'dark');
initDirectionalTopbar();
setSplashCursorEnabled(splashCursorEnabled);
createApp({
  name: 'NoteLineSidebarMount',
  setup() {
    return () => h(LineSidebar, {
      items: noteOutlineState.items,
      activeIndex: noteOutlineState.activeIndex,
      accentColor: 'var(--accent)',
      textColor: 'var(--muted-2)',
      markerColor: 'var(--line)',
      proximityRadius: 92,
      maxShift: 14,
      markerLength: 28,
      tickScale: .48,
      itemGap: 13,
      smoothing: 110,
      onItemClick: (_index, item) => activateNoteOutlineItem(item),
      onItemToggle: (_index, item) => toggleNoteOutlineItem(item)
    });
  }
}).mount('#noteOutlineList');
createApp({
  name: 'CircularGalleryMount',
  setup() {
    return () => h(CircularGallery, {
      items: circularGalleryState.items,
      bend: 2.8,
      textColor: '#ffffff',
      borderRadius: 0.075,
      font: '600 18px "Noto Sans SC", "DM Sans", sans-serif',
      scrollSpeed: 2,
      scrollEase: 0.055
    });
  }
}).mount('#circularGalleryMount');
const rotatingGreeting = createRotatingText($('#greeting'), { texts: ['上午好'], interval: 2600, stagger: 28 });
renderEngines();
renderCategoryOptions();
renderSites();
loadActiveNote();
createSpecularButtonGroup(document, { proximity: 250 });
createSpecularButton($('#noteSlashMenu'), { proximity: 320 });
initAurora($('#auroraTop'));
updateTime();
setInterval(updateTime, 1000);
initializeAuth();
