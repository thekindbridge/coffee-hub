import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    esbuild: {
      drop: ['console', 'debugger'],
      legalComments: 'none',
    },
    build: {
      assetsInlineLimit: 2048,
      cssCodeSplit: true,
      cssMinify: true,
      minify: 'esbuild',
      modulePreload: {
        polyfill: false,
      },
      reportCompressedSize: false,
      sourcemap: false,
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: id => {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('@react-google-maps/api')) {
              return 'vendor-google-maps';
            }

            if (id.includes('firebase/firestore')) {
              return 'vendor-firebase-firestore';
            }

            if (id.includes('firebase/messaging')) {
              return 'vendor-firebase-messaging';
            }

            if (id.includes('firebase')) {
              return 'vendor-firebase-shared';
            }

            if (id.includes('motion')) {
              return 'vendor-motion';
            }

            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            if (id.includes('react')) {
              return 'vendor-react';
            }

            return 'vendor-shared';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
