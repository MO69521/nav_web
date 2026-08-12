import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { localBookmarksPlugin } from './local-bookmarks.js';

export default defineConfig(({ command }) => ({
  plugins: [vue(), command === 'serve' ? localBookmarksPlugin() : null].filter(Boolean)
}));
