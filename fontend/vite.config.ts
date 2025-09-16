import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/assets': resolve(__dirname, 'src/assets'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/store': resolve(__dirname, 'src/store'),
      '@/api': resolve(__dirname, 'src/api'),
      '@/views': resolve(__dirname, 'src/view'),
      '@/types': resolve(__dirname, 'types')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          antdv: ['ant-design-vue'],
          utils: ['dayjs', 'lodash-es']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 9000,
    open: true
  }
})
