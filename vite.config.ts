import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

function neonApiPlugin(): Plugin {
  const storePath = path.resolve(__dirname, '.neon-server-mirror.json');

  const readStore = (): Record<string, unknown[]> => {
    try {
      if (fs.existsSync(storePath)) {
        return JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      }
    } catch {
      // ignore corrupted store
    }
    return {};
  };

  const writeStore = (data: Record<string, unknown[]>) => {
    try {
      fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // ignore write error
    }
  };

  const attachMiddleware = (middlewares: {
    use: (
      route: string,
      fn: (
        req: { method?: string; url?: string; on: (ev: string, cb: (chunk?: Buffer) => void) => void },
        res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void },
        next: () => void
      ) => void
    ) => void;
  }) => {
    middlewares.use('/api/neon', (req, res, next) => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url?.startsWith('/health')) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            engine: 'neon-serverless-postgres',
            hasRemoteUrl: Boolean(process.env.DATABASE_URL || process.env.VITE_NEON_DATABASE_URL),
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      if (req.url?.startsWith('/sync') && req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', (chunk?: Buffer) => {
          if (chunk) chunks.push(chunk);
        });
        req.on('end', async () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf-8');
            const body = raw ? JSON.parse(raw) : {};
            const mutations = Array.isArray(body.mutations) ? body.mutations : [];
            const userId = typeof body.userId === 'string' ? body.userId : 'anonymous';

            const store = readStore();
            const processedIds: string[] = [];

            for (const m of mutations) {
              if (!m || !m.entity || !m.recordId) continue;
              const table = String(m.entity);
              if (!Array.isArray(store[table])) {
                store[table] = [];
              }
              const list = store[table] as Array<Record<string, unknown>>;
              const idx = list.findIndex((item) => item.id === m.recordId);

              // Enforce ownership rule for user-owned records
              if (
                ['workouts', 'diet_logs', 'body_metrics', 'personal_records'].includes(table) &&
                m.payload?.user_id &&
                userId !== 'anonymous' &&
                m.payload.user_id !== userId
              ) {
                continue;
              }

              if (m.operation === 'delete') {
                if (idx >= 0) list.splice(idx, 1);
              } else {
                const merged = {
                  ...(idx >= 0 ? list[idx] : {}),
                  ...(m.payload || {}),
                  id: m.recordId,
                  _serverVersion: Date.now(),
                  _syncedBy: userId,
                };
                if (idx >= 0) {
                  list[idx] = merged;
                } else {
                  list.push(merged);
                }
              }
              processedIds.push(String(m.id || m.recordId));
            }

            writeStore(store);

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                engine: 'neon-serverless-postgres',
                processedCount: processedIds.length,
                processedIds,
                serverTimestamp: new Date().toISOString(),
              })
            );
          } catch (err) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                ok: false,
                error: err instanceof Error ? err.message : 'Invalid sync payload',
              })
            );
          }
        });
        return;
      }

      if (req.url?.startsWith('/mirror') && req.method === 'GET') {
        const store = readStore();
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, store }));
        return;
      }

      next();
    });
  };

  return {
    name: 'vite-plugin-neon-api',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    neonApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg', 'icons/icon-maskable.svg'],
      manifest: {
        name: 'FITKONIC — Discipline Today. A Stronger Tomorrow.',
        short_name: 'Fitkonic',
        description: 'Modern fitness competition, workout logging, and accountability PWA powered by Neon DB.',
        theme_color: '#07090C',
        background_color: '#07090C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['fitness', 'health', 'sports', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fitkonic-google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fitkonic-images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'zustand', '@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-db': ['dexie', 'dexie-react-hooks', '@neondatabase/serverless'],
          'vendor-icons': ['lucide-react', 'date-fns', 'zod'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
