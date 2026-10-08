import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    // Unimplemented, empty scaffolds; no geocoding/parser behavior exists to test yet.
    exclude: [...configDefaults.exclude, 'src/shared/services/geocoding.test.ts', 'src/shared/utils/queryParser.test.ts'],
    setupFiles: './src/test-setup.ts',
  },
})
