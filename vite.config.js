// vite.config.cjs

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production'

  /* ─ 環境別 URL ─ */
  const API_TARGET = isProd
    ? 'https://tabiguide.net'
    : 'http://localhost:8080'

  const GUEST_ORIGIN = isProd
      ? 'https://app.tabiguide.net'    // PWA 本番
      : 'http://localhost:8080'              // 開発サーバ

  const SPEECH_WS = isProd
  ? 'wss://tabiguide-speech-364524278619.asia-northeast1.run.app'    // PWA 本番
  : 'ws://localhost:4000'

  // Google Cloud Storage base (public)
  const GCS_BASE = 'https://storage.googleapis.com/'

  
      
  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },

    /* devServer だけプロキシ */
    server: {
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true
        },
        '/upload': {
          target: API_TARGET,
          changeOrigin: true
        }
      }
    },

    /* 全コードで import.meta.env.VITE_GUEST_ORIGIN を参照可能に */
    define: {
      'import.meta.env.VITE_GUEST_ORIGIN': JSON.stringify(GUEST_ORIGIN),
      'import.meta.env.VITE_API_BASE': JSON.stringify(API_TARGET),
      'import.meta.env.VITE_UPLOAD_BASE': JSON.stringify(isProd ? API_TARGET : ''),
      'import.meta.env.VITE_GCS_BASE': JSON.stringify(GCS_BASE),
      'import.meta.env.VITE_SPEECH_WS': JSON.stringify(SPEECH_WS)
    },

    base: '/',          // ルート配信
    build: { outDir: 'dist' }
  }
})
