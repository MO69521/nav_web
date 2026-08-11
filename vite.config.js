import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import netlify from '@netlify/vite-plugin';
import { localBookmarksPlugin } from './local-bookmarks.js';

export default defineConfig(({ command }) => ({
  plugins: [command === 'serve' ? netlify() : null, vue(), command === 'serve' ? localBookmarksPlugin() : null].filter(Boolean)
}));
