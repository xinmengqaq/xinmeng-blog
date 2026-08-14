import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { live2dWidgetPatch } from './vite/live2d-widget-patch'

export default defineConfig({
  plugins: [react(), live2dWidgetPatch()],
  optimizeDeps: {
    // 整个包按源码加载：让补丁插件接管 waifu-tips.js 与 chunk 的全部相对导入，
    // 避免开发模式预构建把原版模块引入模块图并覆盖 window.initWidget
    exclude: ['live2d-widgets'],
  },
  build: {
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/admin/files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/user/files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/admin/music': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/music': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
