import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { transform as esbuildTransform } from 'esbuild';
import { version } from './package.json';

// Custom plugin: transform JSX in .js files before Vite's import analysis.
// CRA allows JSX in .js files, but Vite's build-import-analysis plugin
// runs before @vitejs/plugin-react, so we need a pre-plugin to handle it.
const jsxInJsPlugin = {
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    // Only process .js files in src/ that contain JSX syntax.
    if (!id.endsWith('.js') || !id.includes('/src/') || !/<[A-Za-z]/.test(code)) {
      return null;
    }
    try {
      const result = await esbuildTransform(code, {
        loader: 'jsx',
        jsx: 'automatic',
        target: 'esnext',
        sourcemap: true,
      });
      return { code: result.code, map: result.map };
    } catch {
      // If esbuild fails, let the React plugin handle it.
      return null;
    }
  },
};

// Vite configuration for the GamePilot renderer.
// The Electron main process files (electron.js, electron/**, etc.) are
// CommonJS and run natively in Electron — they are NOT bundled by Vite.
export default defineConfig({
  plugins: [
    jsxInJsPlugin,
    react(),
    nodePolyfills({
      include: ['path', 'os', 'process', 'stream', 'crypto', 'url', 'util', 'buffer', 'http', 'https'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split large vendor libraries into separate chunks so the main
          // index bundle doesn't have to load them all upfront.
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('html2canvas')) return 'canvas';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react-dom') || id.includes('scheduler')) return 'react-dom';
            if (id.includes('react/') || id.includes('react\\') || id.includes('/react/')) return 'react';
          }
          return undefined;
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    'process.env.PUBLIC_URL': JSON.stringify(''),
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
