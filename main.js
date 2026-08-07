import { initAurora } from './aurora.js';
import { createDragSortEffect } from './drag-sort-effect.js';
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
  { id: 'favorites', name: '我的收藏', icon: '☆' },
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

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

let customSites = store.get('mos-custom-sites', []);
let customCategories = store.get('mos-custom-categories', []);
let favorites = new Set(store.get('mos-favorites', ['figma', 'chatgpt', 'notion', 'github', 'pinterest', 'linear']));
let hiddenSites = new Set(store.get('mos-hidden-sites', []));
let siteOrder = store.get('mos-site-order', []);
let siteGroups = store.get('mos-site-groups', []).map(group => ({ ...group, parentId: group.parentId ?? null }));
let currentCategory = 'all';
let currentEngine = engines[0];
let searchQuery = '';
let activeGroupId = null;
let currentUser = null;
let authMode = 'login';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
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
const allCategories = () => [...builtInCategories, ...customCategories];

function escapeHTML(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function siteCard(site) {
  const isFavorite = favorites.has(site.id);
  const domain = new URL(site.url).hostname.replace('www.', '');
  const faviconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(site.url)}&sz=64`;
  return `<article class="site-card" data-id="${site.id}">
    <a class="card-link" href="${escapeHTML(site.url)}" target="_blank" rel="noreferrer" draggable="false" aria-label="打开 ${escapeHTML(site.name)}"></a>
    <div class="site-icon" style="--site-color:${site.color}"><img class="site-favicon" src="${faviconUrl}" alt="" loading="lazy" draggable="false" /><span class="icon-fallback">${escapeHTML(site.icon)}</span></div>
    <div class="site-info"><h3>${escapeHTML(site.name)}</h3><p>${escapeHTML(site.desc)}</p><span>${domain}</span></div>
    <div class="card-actions">
      <button class="more-btn" data-action="menu" type="button" aria-label="更多操作" aria-expanded="false">•••</button>
      <div class="card-action-menu" role="menu">
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-action="favorite" type="button" role="menuitem"><span>${isFavorite ? '★' : '☆'}</span>${isFavorite ? '取消收藏' : '收藏'}</button>
        <button class="delete-btn" data-action="delete" type="button" role="menuitem"><span>×</span>移除</button>
      </div>
    </div>
    <span class="open-arrow">↗</span>
  </article>`;
}

function siteGroupCard(group, members) {
  const miniIcons = members.slice(0, 4).map(site => {
    const faviconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(site.url)}&sz=64`;
    return `<span class="group-mini-icon" style="--site-color:${site.color}"><img class="site-favicon" src="${faviconUrl}" alt="" loading="lazy" draggable="false" /><span class="icon-fallback">${escapeHTML(site.icon)}</span></span>`;
  }).join('');
  return `<article class="site-card site-group-card" data-group-id="${group.id}" role="button" tabindex="0" aria-label="打开分组 ${escapeHTML(group.name)}，${members.length} 个网址">
    <div class="group-icon-grid">${miniIcons}</div>
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

function renderCategoryTabs() {
  $('#categoryTabs').innerHTML = `${allCategories().map(category => {
    const isCustom = category.custom;
    return `<button class="nav-item ${currentCategory === category.id ? 'active' : ''} ${isCustom ? 'custom-tab' : ''}" data-category="${category.id}">
      <span>${escapeHTML(category.name)}</span>
      ${isCustom ? `<span class="tab-remove" data-remove-category="${category.id}" title="删除空分类" aria-label="删除 ${escapeHTML(category.name)}">×</span>` : ''}
    </button>`;
  }).join('')}<button class="category-add" type="button" data-add-category aria-label="新建分类"><span>＋</span><span>新建分类</span></button>`;
}

function renderCategoryOptions() {
  const options = [...builtInCategories.filter(category => !['all', 'favorites'].includes(category.id)), ...customCategories];
  $('#addForm select[name="category"]').innerHTML = options.map(category => `<option value="${category.id}">${escapeHTML(category.name)}</option>`).join('');
}

function renderSites() {
  const query = searchQuery.trim().toLocaleLowerCase('zh-CN');
  const sites = allSites().filter(site => {
    if (query) {
      const categoryName = allCategories().find(category => category.id === site.category)?.name ?? '';
      return [site.name, site.url, site.desc, categoryName].some(value => value.toLocaleLowerCase('zh-CN').includes(query));
    }
    return currentCategory === 'all' || (currentCategory === 'favorites' ? favorites.has(site.id) : site.category === currentCategory);
  });
  const groupedView = !query && currentCategory === 'all';
  const siteMarkup = groupedView ? renderGroupedSites(sites) : sites.map(siteCard).join('');
  const addButton = query ? '' : '<button class="add-site-card" type="button" data-action="open-add"><span>＋</span><strong>新增网址</strong></button>';
  $('#siteGrid').innerHTML = `${siteMarkup}${addButton}`;
  $('#siteGrid').classList.add('compact-grid');
  $('#emptyState').hidden = sites.length > 0 || !query;
  if (query && sites.length === 0) {
    $('#emptyState h3').textContent = '没有找到匹配的网址';
    $('#emptyState p').textContent = '换个关键词试试，或按 Enter 搜索互联网。';
  }
  renderCategoryTabs();
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

function createOrExtendGroup(sourceId, targetCard) {
  const targetGroupId = targetCard.dataset.groupId;
  if (targetGroupId) {
    const group = siteGroups.find(item => item.id === targetGroupId);
    if (!group || group.siteIds.includes(sourceId)) return false;
    group.siteIds.push(sourceId);
    persistGroups();
    return 'extended';
  }

  const targetId = targetCard.dataset.id;
  if (!targetId || targetId === sourceId) return false;
  const source = allSites().find(site => site.id === sourceId);
  const target = allSites().find(site => site.id === targetId);
  if (!source || !target) return false;
  const sharedCategory = source.category === target.category
    ? allCategories().find(category => category.id === source.category)?.name
    : null;
  const baseName = sharedCategory ? `${sharedCategory}分组` : '新分组';
  let name = baseName;
  let suffix = 2;
  while (siteGroups.some(group => group.name === name)) name = `${baseName} ${suffix++}`;
  siteGroups.push({ id: `group-${Date.now()}`, name, siteIds: [targetId, sourceId], parentId: null });
  persistGroups();
  return 'created';
}

function openGroupDialog(groupId) {
  activeGroupId = groupId;
  const group = findGroup(groupId);
  if (!group) return;
  const siteMap = new Map(allSites().map(site => [site.id, site]));
  const members = group.siteIds.map(id => siteMap.get(id)).filter(Boolean);
  const nestedGroups = childGroups(groupId);
  $('#groupNameInput').value = group.name;
  $('#groupBackButton').hidden = !group.parentId;
  $('#groupDialogSites').innerHTML = members.map(site => {
    const faviconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(site.url)}&sz=64`;
    return `<a class="group-sort-item" data-site-id="${site.id}" href="${escapeHTML(site.url)}" target="_blank" rel="noreferrer" draggable="false"><span class="group-dialog-icon" style="--site-color:${site.color}"><img class="site-favicon" src="${faviconUrl}" alt="" draggable="false" /><span class="icon-fallback">${escapeHTML(site.icon)}</span></span><strong>${escapeHTML(site.name)}</strong></a>`;
  }).join('') + nestedGroups.map(nested => {
    const nestedMembers = collectGroupSiteIds(nested.id).map(id => siteMap.get(id)).filter(Boolean);
    const miniIcons = nestedMembers.slice(0, 4).map(site => {
      const faviconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(site.url)}&sz=64`;
      return `<span class="group-mini-icon" style="--site-color:${site.color}"><img class="site-favicon" src="${faviconUrl}" alt="" /><span class="icon-fallback">${escapeHTML(site.icon)}</span></span>`;
    }).join('');
    return `<button type="button" class="group-sort-item nested-group-item" data-nested-group-id="${nested.id}"><span class="group-icon-grid">${miniIcons}</span><strong>${escapeHTML(nested.name)}</strong><small>${nestedMembers.length} 个项目</small></button>`;
  }).join('');
  if (!$('#groupDialog').open) $('#groupDialog').showModal();
}

function showToast(message, { duration = 1800, actionLabel, onAction } = {}) {
  const toast = $('#toast');
  clearTimeout(showToast.timer);
  clearTimeout(showToast.cleanupTimer);
  const messageNode = document.createElement('span');
  messageNode.textContent = message;
  toast.replaceChildren(messageNode);

  if (actionLabel && onAction) {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.textContent = actionLabel;
    actionButton.addEventListener('click', () => {
      clearTimeout(showToast.timer);
      toast.classList.remove('show');
      onAction();
    });
    toast.append(actionButton);
  }

  toast.classList.add('show');
  showToast.timer = setTimeout(() => {
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
  $('#greeting').textContent = hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';
  const week = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
  $('#dateLine').textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${week}`;
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
    if (customSites.some(site => site.category === categoryId)) {
      showToast('请先删除该分类中的网址');
      return;
    }
    customCategories = customCategories.filter(category => category.id !== categoryId);
    store.set('mos-custom-categories', customCategories);
    if (currentCategory === categoryId) currentCategory = 'all';
    renderCategoryOptions();
    renderSites();
    showToast('分类已删除');
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
      openGroupDialog(card.dataset.groupId);
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
  if (action.dataset.action === 'favorite') {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    store.set('mos-favorites', [...favorites]);
    renderSites();
    showToast(favorites.has(id) ? '已加入收藏' : '已取消收藏');
  }
  if (action.dataset.action === 'delete') {
    const deletedSite = allSites().find(site => site.id === id);
    const originalIndex = allSites().findIndex(site => site.id === id);
    const wasFavorite = favorites.has(id);
    const isBuiltIn = baseSites.some(site => site.id === id);
    const deletedGroup = siteGroups.find(group => group.siteIds.includes(id));

    if (isBuiltIn) hiddenSites.add(id);
    else customSites = customSites.filter(site => site.id !== id);
    favorites.delete(id);
    siteOrder = siteOrder.filter(siteId => siteId !== id);
    siteGroups = siteGroups
      .map(group => ({ ...group, siteIds: group.siteIds.filter(siteId => siteId !== id) }))
      .filter(group => group.siteIds.length > 1);
    store.set('mos-hidden-sites', [...hiddenSites]);
    store.set('mos-custom-sites', customSites);
    store.set('mos-favorites', [...favorites]);
    store.set('mos-site-order', siteOrder);
    persistGroups();
    renderSites();
    showToast('网址已移除', {
      duration: 6000,
      actionLabel: '撤销',
      onAction: () => {
        if (isBuiltIn) hiddenSites.delete(id);
        else if (deletedSite && !customSites.some(site => site.id === id)) customSites.push(deletedSite);
        if (wasFavorite) favorites.add(id);

        const restoredOrder = allSites().map(site => site.id).filter(siteId => siteId !== id);
        restoredOrder.splice(Math.min(originalIndex, restoredOrder.length), 0, id);
        siteOrder = restoredOrder;
        if (deletedGroup) {
          siteGroups = siteGroups.filter(group => group.id !== deletedGroup.id && !group.siteIds.some(siteId => deletedGroup.siteIds.includes(siteId)));
          siteGroups.push(deletedGroup);
        }

        store.set('mos-hidden-sites', [...hiddenSites]);
        store.set('mos-custom-sites', customSites);
        store.set('mos-favorites', [...favorites]);
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
  openGroupDialog(groupCard.dataset.groupId);
});

$('#siteGrid').addEventListener('error', event => {
  if (!event.target.matches('.site-favicon')) return;
  event.target.hidden = true;
  event.target.nextElementSibling.classList.add('visible');
}, true);

let suppressCardClick = false;
let pointerDrag = null;
const siteGrid = $('#siteGrid');
const siteDragEffect = createDragSortEffect({ container: siteGrid, itemSelector: '.site-card[data-id]' });

function saveVisibleSiteOrder() {
  const visibleOrder = $$('#siteGrid .site-card[data-id]').map(card => card.dataset.id);
  const visibleSet = new Set(visibleOrder);
  let visibleIndex = 0;
  siteOrder = allSites().map(site => visibleSet.has(site.id) ? visibleOrder[visibleIndex++] : site.id);
  store.set('mos-site-order', siteOrder);
}

function clearDropTargets(dragState) {
  clearTimeout(dragState.groupTimer);
  dragState.groupTarget?.classList.remove('group-target');
  dragState.reorderTarget?.classList.remove('reorder-target', 'drop-after');
  dragState.groupTarget = null;
  dragState.reorderTarget = null;
  dragState.groupCandidate = null;
  dragState.groupTimer = null;
  dragState.lastSortTarget = null;
}

function scheduleGroupTarget(target) {
  if (pointerDrag.groupTarget && pointerDrag.groupTarget !== target) {
    pointerDrag.groupTarget.classList.remove('group-target');
    pointerDrag.groupTarget = null;
  }
  if (pointerDrag.groupCandidate === target) return;
  clearTimeout(pointerDrag.groupTimer);
  pointerDrag.groupCandidate = target;
  pointerDrag.groupTimer = setTimeout(() => {
    if (!pointerDrag || pointerDrag.groupCandidate !== target) return;
    pointerDrag.reorderTarget?.classList.remove('reorder-target', 'drop-after');
    pointerDrag.reorderTarget = null;
    pointerDrag.groupTarget?.classList.remove('group-target');
    pointerDrag.groupTarget = target;
    target.classList.add('group-target');
  }, 700);
}

function cancelGroupTarget() {
  if (!pointerDrag) return;
  clearTimeout(pointerDrag.groupTimer);
  pointerDrag.groupTimer = null;
  pointerDrag.groupCandidate = null;
  pointerDrag.groupTarget?.classList.remove('group-target');
  pointerDrag.groupTarget = null;
}

siteGrid.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('.card-actions')) return;
  const card = event.target.closest('.site-card[data-id]');
  if (!card) return;
  pointerDrag = {
    pointerId: event.pointerId,
    card,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    groupTarget: null,
    groupCandidate: null,
    groupTimer: null,
    reorderTarget: null,
    lastSortTarget: null
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
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.site-card');
  if (!target || target === pointerDrag.card || target.parentElement !== siteGrid) {
    clearDropTargets(pointerDrag);
    return;
  }

  const rect = target.getBoundingClientRect();
  const canGroup = currentCategory === 'all' && !searchQuery.trim();
  const inGroupZone = target.dataset.groupId || (
    Math.abs(event.clientX - (rect.left + rect.width / 2)) < rect.width * .3 &&
    Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * .36
  );
  if (pointerDrag.groupTarget === target) {
    return;
  }
  if (canGroup && inGroupZone) scheduleGroupTarget(target);
  else cancelGroupTarget();
  if (!target.dataset.id) return;
  const sortableCards = [...siteGrid.querySelectorAll('.site-card[data-id]')];
  const sourceIndex = sortableCards.indexOf(pointerDrag.card);
  const targetIndex = sortableCards.indexOf(target);
  const placeAfter = sourceIndex < targetIndex;
  if (pointerDrag.reorderTarget !== target) pointerDrag.reorderTarget?.classList.remove('reorder-target', 'drop-after');
  pointerDrag.reorderTarget = target;
  target.classList.add('reorder-target');
  target.classList.toggle('drop-after', placeAfter);
  if (pointerDrag.lastSortTarget === target) return;
  pointerDrag.lastSortTarget = target;
  const beforeRects = new Map([...siteGrid.querySelectorAll('.site-card[data-id]')].map(card => [card, card.getBoundingClientRect()]));
  siteGrid.insertBefore(pointerDrag.card, placeAfter ? target.nextSibling : target);
  siteDragEffect.reflow(beforeRects, pointerDrag.card);
});

function finishPointerDrag(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
  const dragState = pointerDrag;
  const { pointerId, card, moved, groupTarget } = dragState;
  pointerDrag = null;
  if (siteGrid.hasPointerCapture?.(pointerId)) siteGrid.releasePointerCapture(pointerId);
  clearDropTargets(dragState);

  if (moved && groupTarget) {
    siteDragEffect.finish({ settle: false });
    const result = createOrExtendGroup(card.dataset.id, groupTarget);
    renderSites();
    if (result === 'created') showToast('已创建分组，点击可改名');
    if (result === 'extended') showToast('已加入分组');
  } else if (moved) {
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
  if (event.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { event.preventDefault(); $('#searchInput').focus(); }
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

$('#themeToggle').addEventListener('click', () => {
  applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
});

$('.theme-options').addEventListener('click', event => {
  const button = event.target.closest('[data-theme]');
  if (!button) return;
  applyTheme(button.dataset.theme);
});

$('#shuffleBtn').addEventListener('click', () => {
  const sites = allSites();
  const site = sites[Math.floor(Math.random() * sites.length)];
  window.open(site.url, '_blank', 'noopener');
});

const dialog = $('#addDialog');
function openSiteDialog() {
  renderCategoryOptions();
  const select = $('#addForm select[name="category"]');
  if (!['all', 'favorites'].includes(currentCategory) && [...select.options].some(option => option.value === currentCategory)) {
    select.value = currentCategory;
  }
  dialog.showModal();
}

$('#openAdd').addEventListener('click', openSiteDialog);
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
  const group = siteGroups.find(entry => entry.id === groupPointerDrag.groupId);
  if (!group) return;

  group.siteIds = group.siteIds.filter(id => id !== groupPointerDrag.siteId);
  if (collectGroupSiteIds(group.id).length < 2) {
    const parent = findGroup(group.parentId);
    if (parent) {
      group.siteIds.forEach(id => { if (!parent.siteIds.includes(id)) parent.siteIds.push(id); });
      childGroups(group.id).forEach(child => { child.parentId = parent.id; });
    }
    siteGroups = siteGroups.filter(entry => entry.id !== group.id);
  }
  groupPointerDrag.exited = true;
  groupPointerDrag.lastTarget = null;
  groupDragEffect.movePortal(document.body);
  groupDialog.close();
  renderSites();

  const externalCard = [...siteGrid.querySelectorAll('.site-card[data-id]')]
    .find(card => card.dataset.id === groupPointerDrag.siteId);
  groupPointerDrag.externalCard = externalCard ?? null;
  externalCard?.classList.add('sort-dragging');
}

function updateGroupExitPosition(event) {
  const dragState = groupPointerDrag;
  const source = dragState?.externalCard;
  if (!source) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.site-card[data-id]');
  if (!target || target === source || target.parentElement !== siteGrid) {
    dragState.dropTarget?.classList.remove('reorder-target', 'drop-after');
    dragState.dropTarget = null;
    dragState.lastTarget = null;
    return;
  }

  const items = [...siteGrid.querySelectorAll('.site-card[data-id]')];
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
  if (!item?.dataset.siteId) return;
  groupPointerDrag = {
    pointerId: event.pointerId,
    item,
    siteId: item.dataset.siteId,
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
    const dialogRect = groupDialog.getBoundingClientRect();
    const outsideDialog = event.clientX < dialogRect.left || event.clientX > dialogRect.right || event.clientY < dialogRect.top || event.clientY > dialogRect.bottom;
    if (outsideDialog) beginGroupExitDrag();
  }
  if (groupPointerDrag.exited) {
    updateGroupExitPosition(event);
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
  const { moved, exited, externalCard, groupTarget, siteId, groupId } = dragState;
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
    showToast('已移出分组并保存位置');
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
  openGroupDialog(nestedGroup.dataset.nestedGroupId);
}, true);

$('#closeGroupDialog').addEventListener('click', () => groupDialog.close());
$('#finishGroup').addEventListener('click', () => groupDialog.close());
$('#groupBackButton').addEventListener('click', () => {
  const group = findGroup(activeGroupId);
  if (group?.parentId) openGroupDialog(group.parentId);
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
  groupDialog.close();
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
  if (signedIn && currentUser.email) store.set('mos-last-login-email', currentUser.email);
  $('#authGuestView').hidden = signedIn;
  $('#authUserView').hidden = !signedIn;
  $('#authTitle').textContent = signedIn ? '我的账号' : authMode === 'login' ? '邮箱登录' : '创建账号';
  const initials = userInitials(currentUser);
  $('#avatarText').textContent = signedIn ? initials : 'MO';
  $('#accountButton').setAttribute('aria-label', signedIn ? `账号：${currentUser.email}` : '邮箱登录');
  $('#accountButton').title = signedIn ? currentUser.email : '邮箱登录';
  if (signedIn) {
    $('#authUserAvatar').textContent = initials;
    $('#authUserEmail').textContent = currentUser.email;
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

$('#accountButton').addEventListener('click', () => {
  renderAuthState();
  if (!currentUser) {
    renderAuthMode();
    prefillRememberedEmail();
  }
  authDialog.showModal();
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
$('#authLogout').addEventListener('click', async () => {
  try {
    await logout();
    currentUser = null;
    renderAuthState();
    authDialog.close();
    showToast('已退出登录');
  } catch (error) {
    showToast(readableAuthError(error));
  }
});

async function initializeAuth() {
  try {
    const callback = await handleAuthCallback();
    if (callback?.user) {
      currentUser = callback.user;
      showToast(callback.type === 'confirmation' ? '邮箱验证成功' : '登录成功');
    } else {
      currentUser = await getUser();
    }
  } catch (error) {
    if (!(error instanceof MissingIdentityError)) showToast(readableAuthError(error));
  }
  renderAuthState();
  onAuthChange((_event, user) => {
    currentUser = user;
    renderAuthState();
  });
}

applyTheme(store.get('mos-light-theme', false) ? 'light' : 'dark');
renderEngines();
renderCategoryOptions();
renderSites();
initAurora($('#auroraTop'));
updateTime();
setInterval(updateTime, 1000);
initializeAuth();
