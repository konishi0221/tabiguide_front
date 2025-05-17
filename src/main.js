// src/main.js
import { createApp }    from 'vue'
import { createPinia, storeToRefs }  from 'pinia'
import { createI18n }   from 'vue-i18n'
import router           from './router'
import App              from './App.vue'
import Toast            from 'vue-toastification'
import { detectLang }   from './lib/lang'
import axios            from 'axios'

import { useAppStore }   from '@/stores/info'
import { useDesignStore } from '@/stores/design'

import 'vue-toastification/dist/index.css'
import './style.css'
const targetUrl   = import.meta.env.VITE_API_BASE        // ↔ API_TARGET

// Google Cloud Storage
const GCS_BASE   = 'https://storage.googleapis.com/'
const GCS_BUCKET = 'tabiguide_uploads'

/* ───────────── axios baseURL ───────────── */
axios.defaults.baseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE        // 本番
  : 'http://localhost:8080'              // ローカル

// Default language based on browser
const defaultLang = detectLang()

const localeFiles = import.meta.glob('./locales/*.json',{ eager:true })
const messages = Object.fromEntries(
  Object.entries(localeFiles).map(([p,m])=>[p.match(/([a-z]{2})\.json$/)[1],m.default])
)
const i18n = createI18n({ legacy:false, locale: defaultLang, fallbackLocale:'en', messages })


/* ───────────── Vue アプリ ───────────── */
const app   = createApp(App)
const pinia = createPinia()

// Piniaのデバッグログを無効化
pinia.use(() => ({ debug: false }))

app.use(pinia).use(router).use(Toast).use(i18n)



/* ───────────── 共通 API 呼び出し ───────────── */


/* ───────────── ルーター準備後の処理 ───────────── */
router.isReady().then(()=>{
  const designStore = useDesignStore()

  const appStore = useAppStore()


  const load = async to=>{
    const uid = to.params.pageUid || to.query.pageUid
    const LS_LANG = id => `tg_lang_${id}`
    let lang = localStorage.getItem(LS_LANG(uid)) || defaultLang
    i18n.global.locale.value = lang
    if(uid) {
      await appStore.getInfo() // ← 追加
      await designStore.fetch(uid, lang)
      // デザインデータをCSS変数として設定
      const design = designStore.data
      
      const stamp = Date.now()          // キャッシュバスター

      const rawBg =
        design.background_url
          || `${GCS_BASE}${GCS_BUCKET}/upload/${uid}/images/background.jpg`
          || `${targetUrl}/upload/${uid}/images/background.jpg`

      const bgUrl = `${rawBg}?v=${stamp}`

      if (design) {
        const root = document.documentElement
        // 背景画像の設定

        const img = new Image()
        img.src = bgUrl
        img.onload = () => {
          document.body.style.backgroundImage = `url('${bgUrl}')`
          document.body.style.backgroundSize = 'cover'
          document.body.style.backgroundPosition = 'center'
          document.body.style.backgroundAttachment = 'fixed'
        }

        root.style.setProperty('--accent-color', design.accent_color)
        root.style.setProperty('--marker-color', design.marker_color)
        root.style.setProperty('--primary-color', design.primary_color)
        root.style.setProperty('--secondary-color', design.secondary_color)
        root.style.setProperty('--bot-text-color', design.bot_text_color)
        root.style.setProperty('--tab-text-color', design.tab_text_color)
        root.style.setProperty('--user-text-color', design.user_text_color)
        root.style.setProperty('--tab-active-color', design.tab_active_color)
        root.style.setProperty('--tab-inactive-color', design.tab_inactive_color)
        root.style.setProperty('--bot-message-color', design.bot_message_color)
        root.style.setProperty('--user-message-color', design.user_message_color)
        root.style.setProperty('--header-text-color', design.header_text_color)
        root.style.setProperty('--send-button-color', design.send_button_color)
        root.style.setProperty('--message-text-color', design.message_text_color)
        root.style.setProperty('--send-button-bg-color', design.send_button_bg_color)
        root.style.setProperty('--input-background-color', design.input_background_color)
        
        // フォント設定
        root.style.setProperty('--font-family', design.font_family)
        
        // 背景設定
        const cssBg = `${rawBg}?v=${stamp}`
        root.style.setProperty('--background-url', `url(${cssBg})`)

        root.style.setProperty('--bg-filter-blur', `${design.bg_filter_blur}px`)
        root.style.setProperty('--bg-filter-color', design.bg_filter_color)
        root.style.setProperty('--bg-filter-opacity', design.bg_filter_opacity)

      }
    }
  }

  load(router.currentRoute.value)   // 初回
  router.afterEach(load)            // 画面遷移時
})

app.mount('#app')
