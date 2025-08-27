import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5174
  },
  build: {
    chunkSizeWarningLimit: 500,
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Only split clearly separate vendor libraries
          'vendor-lucide': ['@lucide/svelte'],
          
          // Your application code - explicitly list files you know are safe to split
          'wrestling-core': [
            './src/lib/WrestlingManager.svelte.ts',
            './src/lib/ZonkClock.ts',
            './src/lib/RidingClock.ts'
          ],
          
          'ui-components': [
            './src/components/_UI/ZonkButton.svelte',
            './src/components/_UI/ZonkModal.svelte',
            './src/components/_UI/ZonkDropdown.svelte',
            './src/components/_UI/ConfirmModal.svelte'
          ],
          
          'constants': [
            './src/constants/wrestling.constants.ts'
          ]
          
          // Let everything else (including Svelte runtime) stay in main bundle
        }
      }
    },

    minify: 'esbuild',
    sourcemap: false,
    target: 'esnext',
    cssCodeSplit: true,
    reportCompressedSize: true
  },
  
  optimizeDeps: {
    include: [
      '@lucide/svelte'
    ]
  }
})