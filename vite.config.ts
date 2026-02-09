import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Listen on all addresses
    port: 5173, // Default Vite port
    strictPort: false, // Allow other ports if 5173 is taken
  },
  build: {
    // Optimize build for performance
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate vendor chunks for better caching and parallel loading
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Animation library (heavy)
            if (id.includes('motion')) {
              return 'motion-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // UI libraries
            if (id.includes('@radix-ui') || id.includes('@mui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            // Other large dependencies
            if (id.includes('recharts') || id.includes('react-markdown') || id.includes('date-fns')) {
              return 'utils-vendor';
            }
            // Everything else
            return 'vendor';
          }
        },
      },
    },
    // Enable minification
    minify: 'esbuild',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional - can disable for smaller builds)
    sourcemap: false,
  },
})
