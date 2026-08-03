import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const stylesDir = fileURLToPath(new URL('./src/styles', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // Installable and usable offline. This is not decoration: capture has to
    // work on a phone, in a basement, without waiting for a page load — and
    // Firestore's IndexedDB cache already handles the data half, so only the
    // app shell was missing.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: "Me'Mories",
        short_name: "Me'Mories",
        description:
          'Notez en quelques secondes ce que vous voulez retenir, retrouvez-le des années plus tard.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f6f6f9',
        theme_color: '#5b53e8',
        // A single SVG rather than a set of PNGs: it scales to every size, has
        // a source of truth that can be edited, and avoids committing binaries
        // with no regeneration path. Chrome, Edge, Firefox and Android honour
        // it; iOS still wants a PNG apple-touch-icon (see README).
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Nouvelle mémoire', url: '/?capture=1' },
          { name: 'Relire', url: '/swipe' },
        ],
      },
      workbox: {
        // The Firebase chunk is well past the 2 MiB default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Never cache Firestore or Auth traffic: the SDK owns its own
        // persistence, and a stale cached response would be worse than none.
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('firebaseio.com'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  build: {
    // The firebase chunk lands around 620 kB and cannot shrink: realtime
    // Firestore needs the full SDK (the `lite` build has no onSnapshot, which
    // the whole local-first design rests on). Raised just past it so the
    // warning still fires for chunks we actually control.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Firebase is by far the heaviest dependency and changes only when it
        // is upgraded. Splitting it out means a normal app deploy invalidates a
        // ~30 kB chunk instead of a ~340 kB one, and the two halves download in
        // parallel on a cold visit.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('motion') || id.includes('framer')) return 'motion';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react';
          return undefined;
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Design tokens and mixins are injected into every SCSS module so that
        // components never have to import them. `abstracts` must stay
        // output-free (variables/mixins only) or its CSS would be duplicated in
        // every single module.
        additionalData: '@use "abstracts" as *;\n',
        loadPaths: [stylesDir],
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          css: false,
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
        },
      },
      {
        // Security rules run against the real Firestore emulator, so this
        // project is only meaningful under `npm run test:rules`.
        extends: true,
        test: {
          name: 'rules',
          environment: 'node',
          include: ['tests/rules/**/*.test.ts'],
          testTimeout: 20_000,
          hookTimeout: 20_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
