
import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

import vite_server_config from './vite.server.config.js';

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
    ],
    resolve: {
        extensions: ['.js', '.vue'],
        alias: {
            '@': path.join(import.meta.dirname, 'src'),
        },
    },

    // Development
    server: vite_server_config,

    // Production
    build: {
        chunkSizeWarningLimit: 10000,  // https://github.com/vitejs/vite/discussions/9440
    },
    base: './',
});
