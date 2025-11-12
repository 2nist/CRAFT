import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    lib: {
      entry: {
        main: path.resolve(__dirname, 'electron/main.js'),
        preload: path.resolve(__dirname, 'electron/preload.js'),
      },
      // Build both ES for main and CJS for preload
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName === 'preload') {
          return format === 'cjs' ? 'preload.cjs' : 'preload.mjs'
        }
        if (entryName === 'main') {
          return format === 'es' ? 'main.js' : 'main.cjs'
        }
        return `${entryName}.${format}.js`
      },
    },
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'fs/promises', 'url', 'crypto', 'express', 'cors', 'sqlite3', 'sqlite'],
      // Don't bundle the services - they'll be dynamically imported at runtime
      // This allows them to be imported from src/services/ in development
      plugins: [
        {
          name: 'skip-analysis',
          buildStart() {
            // Hook to potentially skip analysis
          },
          transform(code, id) {
            if (id.includes('electron/main.js')) {
              // Return the code as-is without transformation
              return {
                code,
                map: null
              };
            }
          }
        }
      ]
    },
    emptyOutDir: true,
  },
})
