import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    server: {
      deps: {
        inline: [/@photo-sphere-viewer/]
      }
    },
    css: {
      include: [/.+/]
    },
    alias: {
      'react-photo-sphere-viewer': 'react-photo-sphere-viewer/dist/index.js'
    }
  },
})
