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
      external: [
        'electron',
        'path',
        'fs',
        'fs/promises',
        'url',
        'crypto',
        'util',
        'process',
        'os',
        'child_process',
        'express',
        'cors',
        'sqlite3',
        'sqlite',
        'better-sqlite3',
        'mssql',
        'dotenv',
        'electron-store',
        'axios',
        'tedious',
        'node-fetch'
      ],
      output: {
        manualChunks: undefined
      }
    },
    emptyOutDir: true,
  },
})
