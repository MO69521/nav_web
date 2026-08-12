const WORKSPACE_COLLECTION = 'mos_workspaces';
const SHARE_COLLECTION = 'mos_note_shares';

export class CloudBaseConfigError extends Error {
  constructor() {
    super('请先配置 CloudBase 环境 ID 和 Publishable Key');
    this.name = 'CloudBaseConfigError';
  }
}

let appInstance = null;
let appPromise = null;
let authInstance = null;
let databaseInstance = null;

function configuration() {
  return {
    env: String(import.meta.env.VITE_CLOUDBASE_ENV_ID || '').trim(),
    region: String(import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai').trim(),
    accessKey: String(import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY || '').trim()
  };
}

export function isCloudBaseConfigured() {
  const config = configuration();
  return Boolean(config.env && config.accessKey);
}

async function client() {
  if (appInstance) return appInstance;
  if (appPromise) return appPromise;
  const config = configuration();
  if (!config.env || !config.accessKey) throw new CloudBaseConfigError();
  appPromise = import('@cloudbase/js-sdk').then(module => {
    appInstance = module.default.init({ ...config, auth: { detectSessionInUrl: true } });
    return appInstance;
  });
  return appPromise;
}

async function auth() {
  if (!authInstance) authInstance = (await client()).auth({ persistence: 'local' });
  return authInstance;
}

async function database() {
  if (!databaseInstance) databaseInstance = (await client()).database();
  return databaseInstance;
}

function resultData(result) {
  if (result?.error) {
    const error = new Error(result.error.message || '云开发请求失败');
    Object.assign(error, result.error);
    throw error;
  }
  return result?.data;
}

function normalizeUser(user) {
  if (!user || user.is_anonymous) return null;
  return {
    ...user,
    id: String(user.id || user.uid || ''),
    email: user.email || user.identities?.find(identity => identity.provider === 'email')?.identity_data?.email || '',
    name: user.name || user.user_metadata?.name || '',
    provider: 'cloudbase',
    user_metadata: user.user_metadata || user.metadata || {}
  };
}

function recordFromGet(result) {
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

export async function getCloudBaseUser() {
  if (!isCloudBaseConfigured()) return null;
  const data = resultData(await (await auth()).getSession());
  return normalizeUser(data?.session?.user || data?.user);
}

export async function loginWithCloudBase(email, password) {
  const data = resultData(await (await auth()).signInWithPassword({ email, password }));
  return normalizeUser(data?.user || data?.session?.user);
}

export async function beginCloudBaseEmailOtp(email) {
  const data = resultData(await (await auth()).signInWithOtp({ email, shouldCreateUser: true }));
  if (typeof data?.verifyOtp !== 'function') throw new Error('未能启动邮箱验证');
  return async code => {
    const verified = resultData(await data.verifyOtp({ token: code }));
    return normalizeUser(verified?.user || verified?.session?.user);
  };
}

export async function beginCloudBaseSignup(email, password) {
  const data = resultData(await (await auth()).signUp({ email, password }));
  if (typeof data?.verifyOtp !== 'function') throw new Error('未能启动邮箱验证');
  return async code => {
    const verified = resultData(await data.verifyOtp({ token: code }));
    return normalizeUser(verified?.user || verified?.session?.user);
  };
}

export async function beginCloudBasePasswordReset(email) {
  const data = resultData(await (await auth()).resetPasswordForEmail(email));
  if (typeof data?.updateUser !== 'function') throw new Error('未能启动密码重置');
  return async (code, password) => {
    const updated = resultData(await data.updateUser({ nonce: code, password }));
    return normalizeUser(updated?.user || updated?.session?.user);
  };
}

export async function logoutCloudBase() {
  await (await auth()).signOut();
}

export function onCloudBaseAuthChange(callback) {
  if (!isCloudBaseConfigured()) return () => {};
  let subscription = null;
  let disposed = false;
  auth().then(instance => {
    if (disposed) return;
    subscription = instance.onAuthStateChange((_event, session) => callback(normalizeUser(session?.user)));
  }).catch(() => {});
  return () => {
    disposed = true;
    subscription?.data?.subscription?.unsubscribe?.();
  };
}

async function ensureAnonymousSession() {
  const instance = await auth();
  const data = resultData(await instance.getSession());
  if (data?.session) return data.session;
  const anonymous = resultData(await instance.signInAnonymously());
  return anonymous?.session;
}

export async function readCloudWorkspace(user) {
  if (!user?.id) return null;
  const result = await (await database()).collection(WORKSPACE_COLLECTION).doc(user.id).get();
  return recordFromGet(result)?.workspace || null;
}

export async function writeCloudWorkspace(user, workspace) {
  if (!user?.id) throw new Error('请先登录');
  await (await database()).collection(WORKSPACE_COLLECTION).doc(user.id).set({
    ownerId: user.id,
    workspace,
    updatedAt: Date.now()
  });
}

export async function readCloudShare(token) {
  const result = await (await database()).collection(SHARE_COLLECTION).doc(token).get();
  const share = recordFromGet(result);
  return share?.enabled ? share : null;
}

export async function publishCloudShare(user, token, note, permission) {
  if (!user?.id) throw new Error('请先登录再开启链接分享');
  await (await database()).collection(SHARE_COLLECTION).doc(token).set({
    ownerId: user.id,
    enabled: true,
    permission: permission === 'edit' ? 'edit' : 'view',
    note,
    updatedAt: Date.now()
  });
}

export async function updateCloudShare(token, note) {
  await ensureAnonymousSession();
  await (await database()).collection(SHARE_COLLECTION).doc(token).update({ note, updatedAt: Date.now() });
}

export async function removeCloudShare(user, token) {
  if (!user?.id) return;
  await (await database()).collection(SHARE_COLLECTION).doc(token).remove();
}
