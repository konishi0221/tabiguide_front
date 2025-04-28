// src/main.js
import { createApp }    from 'vue'
import { createPinia }  from 'pinia'
import { createI18n }   from 'vue-i18n'
import router           from './router'
import App              from './App.vue'
import Toast            from 'vue-toastification'
import { detectLang }   from './lib/lang'
import axios            from 'axios'

// import { useAppStore }   from '@/stores/info'
import { useDesignStore } from '@/stores/design'

import 'vue-toastification/dist/index.css'
import './style.css'

/* ───────────── axios baseURL ───────────── */
axios.defaults.baseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE        // 本番
  : 'http://localhost:8080'              // ローカル


/* ───────────── ctx & i18n ───────────── */
const CTX_KEY = 'tg_ctx_GLOBAL'
let ctx = {}
try { ctx = JSON.parse(localStorage.getItem(CTX_KEY) || '{}') } catch {}
ctx.lang = detectLang()
localStorage.setItem(CTX_KEY, JSON.stringify(ctx))

const localeFiles = import.meta.glob('./locales/*.json',{ eager:true })
const messages = Object.fromEntries(
  Object.entries(localeFiles).map(([p,m])=>[p.match(/([a-z]{2})\.json$/)[1],m.default])
)
const i18n = createI18n({ legacy:false, locale:ctx.lang, fallbackLocale:'en', messages })


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

  const load = to=>{
    const uid = to.params.pageUid || to.query.pageUid
    // getInfo(uid)
    if(uid) {
      designStore.fetch(uid)
      // const appStore    = useAppStore()
    }
  }

  load(router.currentRoute.value)   // 初回

  router.afterEach(load)            // 画面遷移時
})

app.mount('#app')
