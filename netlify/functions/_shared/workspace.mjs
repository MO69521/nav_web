const ARRAY_FIELDS = [
  'customSites',
  'customCategories',
  'hiddenBuiltInCategories',
  'hiddenSites',
  'siteOrder',
  'siteGroups',
  'galleryItems',
  'notes'
];

export const WORKSPACE_SCHEMA_VERSION = 1;
export const MAX_WORKSPACE_BYTES = 4_500_000;

export function normalizeWorkspace(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_workspace');
  const workspace = {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    updatedAt: Number(value.updatedAt) || Date.now(),
    activeNoteId: String(value.activeNoteId || ''),
    settings: value.settings && typeof value.settings === 'object' && !Array.isArray(value.settings) ? value.settings : {}
  };
  ARRAY_FIELDS.forEach(field => {
    workspace[field] = Array.isArray(value[field]) ? value[field] : [];
  });
  const serialized = JSON.stringify(workspace);
  if (Buffer.byteLength(serialized) > MAX_WORKSPACE_BYTES) throw new Error('workspace_too_large');
  return workspace;
}
