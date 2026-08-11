import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const homeDirectory = os.homedir();
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

function normalizeBookmarkUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function cleanTitle(value, fallback = '未命名书签') {
  return String(value || fallback).replace(/\s+/g, ' ').trim().slice(0, 120) || fallback;
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function chromiumProfileNames(rootPath) {
  try {
    const localState = JSON.parse(await fs.readFile(path.join(rootPath, 'Local State'), 'utf8'));
    return localState?.profile?.info_cache || {};
  } catch {
    return {};
  }
}

function walkChromiumNode(node, folderPath, entries) {
  if (!node || typeof node !== 'object') return;
  const url = normalizeBookmarkUrl(node.url);
  if (url) {
    entries.push({ name: cleanTitle(node.name, new URL(url).hostname), url, folderPath });
    return;
  }
  const nextPath = node.name ? [...folderPath, cleanTitle(node.name, '书签')] : folderPath;
  (node.children || []).forEach(child => walkChromiumNode(child, nextPath, entries));
}

async function readChromiumBookmarks(profile) {
  const documentNode = JSON.parse(await fs.readFile(profile.sourcePath, 'utf8'));
  const entries = [];
  const rootNames = {
    bookmark_bar: '书签栏',
    other: '其他书签',
    synced: '移动设备书签'
  };
  Object.entries(documentNode.roots || {}).forEach(([rootKey, rootNode]) => {
    const rootPath = [rootNames[rootKey] || cleanTitle(rootNode?.name, '书签')];
    (rootNode?.children || []).forEach(child => walkChromiumNode(child, rootPath, entries));
  });
  return entries;
}

async function chromiumProfiles(browser) {
  if (!await pathExists(browser.rootPath)) return [];
  const profileNames = await chromiumProfileNames(browser.rootPath);
  const directoryEntries = await fs.readdir(browser.rootPath, { withFileTypes: true });
  const profiles = [];
  for (const directory of directoryEntries) {
    if (!directory.isDirectory()) continue;
    const sourcePath = path.join(browser.rootPath, directory.name, 'Bookmarks');
    if (!await pathExists(sourcePath)) continue;
    const savedName = profileNames[directory.name]?.name;
    profiles.push({
      id: `${browser.id}:${encodeURIComponent(directory.name)}`,
      browserId: browser.id,
      browserName: browser.name,
      profileName: cleanTitle(savedName || (directory.name === 'Default' ? '默认用户' : directory.name)),
      sourcePath,
      reader: readChromiumBookmarks
    });
  }
  return profiles;
}

function walkSafariNode(node, folderPath, entries) {
  if (!node || typeof node !== 'object') return;
  const url = normalizeBookmarkUrl(node.URLString);
  const title = cleanTitle(node.URIDictionary?.title || node.Title || '', '');
  if (url) {
    entries.push({ name: title || new URL(url).hostname, url, folderPath });
    return;
  }
  const isGenericRoot = /^(bookmarks?|书签)$/i.test(title);
  const nextPath = title && !isGenericRoot ? [...folderPath, title] : folderPath;
  (node.Children || []).forEach(child => walkSafariNode(child, nextPath, entries));
}

async function readSafariBookmarks(profile) {
  const { stdout } = await execFileAsync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', profile.sourcePath], { maxBuffer: 50 * 1024 * 1024 });
  const documentNode = JSON.parse(stdout);
  const entries = [];
  walkSafariNode(documentNode, [], entries);
  return entries;
}

async function safariProfiles() {
  const sourcePath = path.join(homeDirectory, 'Library/Safari/Bookmarks.plist');
  if (!await pathExists(sourcePath)) return [];
  return [{
    id: 'safari:default',
    browserId: 'safari',
    browserName: 'Safari',
    profileName: '默认用户',
    sourcePath,
    reader: readSafariBookmarks
  }];
}

async function readFirefoxBookmarks(profile) {
  const query = `SELECT b.id, b.parent, b.type, COALESCE(b.title, '') AS title, COALESCE(p.url, '') AS url, b.position FROM moz_bookmarks b LEFT JOIN moz_places p ON b.fk = p.id WHERE b.type IN (1, 2) ORDER BY b.parent, b.position;`;
  const { stdout } = await execFileAsync('/usr/bin/sqlite3', ['-readonly', '-json', profile.sourcePath, query], { maxBuffer: 50 * 1024 * 1024 });
  const rows = JSON.parse(stdout || '[]');
  const folderById = new Map(rows.filter(row => row.type === 2).map(row => [row.id, row]));
  const folderPathFor = parentId => {
    const names = [];
    const visited = new Set();
    let currentId = parentId;
    while (folderById.has(currentId) && !visited.has(currentId)) {
      visited.add(currentId);
      const folder = folderById.get(currentId);
      const title = cleanTitle(folder.title, '');
      if (title && !/^(root|places)$/i.test(title)) names.unshift(title);
      currentId = folder.parent;
    }
    return names;
  };
  return rows.filter(row => row.type === 1).flatMap(row => {
    const url = normalizeBookmarkUrl(row.url);
    if (!url) return [];
    return [{ name: cleanTitle(row.title, new URL(url).hostname), url, folderPath: folderPathFor(row.parent) }];
  });
}

async function firefoxProfiles() {
  const rootPath = path.join(homeDirectory, 'Library/Application Support/Firefox/Profiles');
  if (!await pathExists(rootPath)) return [];
  const directoryEntries = await fs.readdir(rootPath, { withFileTypes: true });
  const profiles = [];
  for (const directory of directoryEntries) {
    if (!directory.isDirectory()) continue;
    const sourcePath = path.join(rootPath, directory.name, 'places.sqlite');
    if (!await pathExists(sourcePath)) continue;
    const profileName = directory.name.includes('.') ? directory.name.split('.').slice(1).join('.') : directory.name;
    profiles.push({
      id: `firefox:${encodeURIComponent(directory.name)}`,
      browserId: 'firefox',
      browserName: 'Firefox',
      profileName: cleanTitle(profileName || '默认用户'),
      sourcePath,
      reader: readFirefoxBookmarks
    });
  }
  return profiles;
}

async function discoverProfiles() {
  const chromiumBrowsers = [
    { id: 'chrome', name: 'Chrome', rootPath: path.join(homeDirectory, 'Library/Application Support/Google/Chrome') },
    { id: 'edge', name: 'Edge', rootPath: path.join(homeDirectory, 'Library/Application Support/Microsoft Edge') }
  ];
  return [
    ...(await Promise.all(chromiumBrowsers.map(chromiumProfiles))).flat(),
    ...await firefoxProfiles(),
    ...await safariProfiles()
  ];
}

function profileErrorMessage(profile, error) {
  if (profile.browserId === 'safari' && /permission|not permitted|eacces/i.test(String(error?.message || error))) {
    return '需要在 macOS「系统设置 → 隐私与安全性 → 完全磁盘访问权限」中允许 Codex 或终端访问';
  }
  return '暂时无法读取该用户的书签';
}

async function scanProfiles() {
  const profiles = await discoverProfiles();
  return Promise.all(profiles.map(async profile => {
    try {
      const entries = await profile.reader(profile);
      return { id: profile.id, browserId: profile.browserId, browserName: profile.browserName, profileName: profile.profileName, count: entries.length, status: 'ready' };
    } catch (error) {
      return { id: profile.id, browserId: profile.browserId, browserName: profile.browserName, profileName: profile.profileName, count: 0, status: 'blocked', message: profileErrorMessage(profile, error) };
    }
  }));
}

async function readSelectedProfiles(profileIds) {
  const requestedIds = new Set(Array.isArray(profileIds) ? profileIds.map(String) : []);
  const profiles = (await discoverProfiles()).filter(profile => requestedIds.has(profile.id));
  const results = [];
  for (const profile of profiles) {
    const entries = await profile.reader(profile);
    const sourceName = profile.profileName === '默认用户' ? profile.browserName : `${profile.browserName} · ${profile.profileName}`;
    results.push(...entries.map(entry => ({ ...entry, folderPath: [sourceName, ...entry.folderPath] })));
  }
  return results;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 128 * 1024) throw new Error('请求数据过大');
  }
  return body ? JSON.parse(body) : {};
}

function isLoopbackRequest(request) {
  const hostname = String(request.headers.host || '').replace(/:\d+$/, '');
  return localHosts.has(hostname);
}

async function handleLocalBookmarks(request, response, next) {
  const requestUrl = new URL(request.url, 'http://localhost');
  if (!requestUrl.pathname.startsWith('/api/local-bookmarks/')) return next();
  if (!isLoopbackRequest(request)) return sendJson(response, 403, { error: '为保护书签隐私，本机扫描只允许通过 localhost 访问' });

  try {
    if (request.method === 'GET' && requestUrl.pathname === '/api/local-bookmarks/profiles') {
      return sendJson(response, 200, { platform: process.platform, profiles: await scanProfiles() });
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/local-bookmarks/read') {
      const body = await readJsonBody(request);
      const entries = await readSelectedProfiles(body.profileIds);
      return sendJson(response, 200, { entries });
    }
    return sendJson(response, 404, { error: '未知的本机书签请求' });
  } catch (error) {
    return sendJson(response, 500, { error: String(error?.message || '本机书签读取失败') });
  }
}

export function localBookmarksPlugin() {
  const install = server => {
    server.middlewares.use(handleLocalBookmarks);
  };
  return {
    name: 'local-bookmarks',
    configureServer: install,
    configurePreviewServer: install
  };
}
