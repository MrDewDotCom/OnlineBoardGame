import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1200 }, // three.js chunk is lazy-loaded // relative paths so the build works on GitHub Pages or any sub-folder
})
