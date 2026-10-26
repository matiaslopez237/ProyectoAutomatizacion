/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Todo queda en un solo index.html: sirve igual para GitHub Pages y para publicarlo como Artifact.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  test: { environment: 'node' },
})
