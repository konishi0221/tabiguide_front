<template>
  <div class="p-6 max-w-md mx-auto">
    <h1 class="text-2xl font-bold mb-4">{{ t('settings.language.title') }}</h1>

    <label class="block mb-2 text-sm font-medium">
      {{ t('settings.language.selectLabel') }}
    </label>

    <select v-model="language" @change="applyLang" class="w-full p-2 rounded border">
      <option v-for="(label, code) in languages" :key="code" :value="code">
        {{ label }}
      </option>
    </select>

    <!-- 開発用: ctx 全削除ボタン -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useAppStore }              from '@/stores/info'      // ← 追加

/* i18n */
const { t, locale } = useI18n()

/* store & route */
const chatStore = useChatStore()
const appStore  = useAppStore()                         // ← 追加

const route     = useRoute()
const pageUid   = route.params.pageUid ?? 'DEMO'

/* 言語リスト */
const languages = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '简体中文',
  zht: '繁體中文',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  es: 'Español'
}

/* v-model 用 */
const language = ref(locale.value)

/* ctx プレビュー（readonly）*/
const ctxPreview = computed(() => JSON.stringify(window.ctx || {}, null, 2))
const acceptLang = computed(() => (navigator.languages?.join(', ') || navigator.language))

/* 初期化 */
onMounted(() => {
  const saved = localStorage.getItem('lang')
  if (saved && languages[saved]) {
    language.value = saved
    locale.value   = saved
  }
})

/* 言語切替 */
function applyLang () {
  const newLang = language.value
  locale.value = newLang
  localStorage.setItem('lang', newLang)
  window.ctx = { ...(window.ctx || {}), lang: newLang }
  chatStore.updateCtx(pageUid, { lang: newLang })
  appStore.getInfo()            // ← 初期フェッチ

}

/* 開発用: ctx 全削除 */
function clearCtx () {
  localStorage.removeItem(`tg_ctx_GLOBAL`)
  localStorage.removeItem(`tg_ctx_${pageUid}`)
  window.ctx = {}
  chatStore.$reset()
  location.reload()
  appStore.getInfo()            // ← 初期フェッチ
}
</script>

<style scoped>
/* Tailwind 主体。必要なら追加スタイルをここへ */
</style>
