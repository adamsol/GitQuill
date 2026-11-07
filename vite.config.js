
import path from 'path';

import vue from '@vitejs/plugin-vue';
import tailwindcss from 'tailwindcss';
import tailwind_nesting from 'tailwindcss/nesting';
import { defineConfig } from 'vite';

import vite_server_config from './vite.server.config.js';

export default defineConfig({
    plugins: [
        vue(),
    ],
    css: {
        postcss: {
            plugins: [
                tailwind_nesting(),
                tailwindcss(),
            ],
        },
    },
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
