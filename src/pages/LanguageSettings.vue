<!-- ---------- src/pages/LanguageSettings.vue ---------- -->
<template>
  <div class="lang-settings">
    <h2>{{ t('settings.language.title') }}</h2>

    <select v-model="selected" @change="apply">
      <option v-for="(label, code) in langs" :key="code" :value="code">
        {{ label }}
      </option>
    </select>


  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat'
import { useRoute } from 'vue-router'

const { t, locale } = useI18n()
const chat  = useChatStore()
const route = useRoute()
const pageUid = route.params.pageUid || route.query.pageUid || ''

const langs = { ja:'日本語', en:'English', ko:'한국어', zh:'简体中文',
                zht:'繁體中文', th:'ไทย', vi:'Tiếng Việt',
                id:'Bahasa Indonesia', es:'Español' }

const selected = ref(chat.lang)

function apply (){
  chat.setLang(pageUid, selected.value)   // ストアと localStorage 更新
  locale.value = selected.value           // vue-i18n ロケール変更
}
</script>

<style>
.lang-settings { padding:20px; max-width:400px; margin:auto; }
.preview       { background:#f8f8f8; padding:10px; border-radius:6px;
                 font-size:14px; white-space:pre-wrap; }
</style>
