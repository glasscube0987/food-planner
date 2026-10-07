import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' lets the built app run from any subpath (GitHub Pages, a file share).
export default defineConfig({
  base: './',
  plugins: [react()],
})
