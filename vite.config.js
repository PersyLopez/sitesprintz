import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  injectPublishedSiteEmbed,
  liveSiteRedirectTarget,
  liveViewDocumentIdentifier
} from './server/utils/siteIsolation.js';

const apiTarget = process.env.API_URL || 'http://localhost:3000';
const rootDir = path.dirname(fileURLToPath(import.meta.url));

function liveSiteRedirectPlugin() {
  const redirect = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const pathOnly = String(req.url || '').split('?')[0];
    const target = liveSiteRedirectTarget(pathOnly, req.url);
    if (!target) return next();
    res.statusCode = 302;
    res.setHeader('Location', target);
    res.end();
  };
  // /view/:subdomain serves the SPA shell; inline the showcase JSON the
  // composed viewer would otherwise fetch, so first paint skips the round
  // trip. Fail open to the unchanged shell.
  const embedShowcase = async (html, ctx) => {
    const url = String(ctx?.originalUrl || ctx?.path || '').split('?')[0];
    const subdomain = liveViewDocumentIdentifier(url);
    if (!subdomain) return html;
    try {
      const response = await fetch(`${apiTarget}/api/showcases/${encodeURIComponent(subdomain)}`);
      if (!response.ok) return html;
      const body = await response.json();
      return injectPublishedSiteEmbed(html, body);
    } catch {
      return html;
    }
  };
  return {
    name: 'live-site-redirect',
    transformIndexHtml: {
      order: 'post',
      handler: embedShowcase,
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const pathOnly = String(req.url || '').split('?')[0];
        if (!liveViewDocumentIdentifier(pathOnly)) return next();
        try {
          const html = fs.readFileSync(path.join(rootDir, 'view.html'), 'utf8');
          const transformed = await server.transformIndexHtml(req.originalUrl || req.url, html);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          res.end(transformed);
        } catch (error) {
          next(error);
        }
      });
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), liveSiteRedirectPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/auth': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/data': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/legal': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, 'index.html'),
        view: path.resolve(rootDir, 'view.html'),
      },
    },
  },
  // Exclude published sites and other backend files
  publicDir: 'public',
});

