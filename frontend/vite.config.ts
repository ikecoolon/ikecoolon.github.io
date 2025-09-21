import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? './' : '/',
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
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9010',
        changeOrigin: true,
        timeout: 10000, // 10秒超时
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('❌ 代理请求失败:', err.message);
            console.log('📡 请求详情:', req.method, req.url);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 代理请求:', req.method, req.url, '->', options.target + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ 代理响应:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
