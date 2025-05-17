<template>
  <div class="chat-wrap">

    <div id="chat_header">
      <img :src="headerLogoSrc" 
           class="header-logo"
           @error="handleHeaderImageError"
           @load="handleHeaderImageLoad" />
      <div v-if="showFacilityName" class="name">{{ facilityName }}</div>

      <router-link
      :to="{ name:'call', params:{ pageUid } }"
      class="call-link"
      aria-label="call">
        <span class="material-symbols-outlined phone">call</span>
      </router-link>
    </div>
    <!-- <div id="chat_header_padding"></div> -->


    <!-- ▸ メッセージ一覧 -->
    <div id="message_wrap">
      <div ref="listRef" class="msg-list">
        <template v-for="(m,i) in chat.messages" :key="i">
          <div :class="m.role==='bot' ? 'bot-row' : ''">
            <img v-if="m.role==='bot'" 
              :src="botIconSrc" 
              class="bot-icon"
              @error="handleImageError" />
            <div
              :class="['bubble', m.role==='bot' ? 'bubble-bot' : 'bubble-user']">

              <!-- テキスト -->
              <div v-if="m.role==='bot'" v-html="nl2br(botText(m))"/>
              <div v-else v-html="nl2br(m.text)"/>

              <!-- マップがあれば同じバブル内に表示 -->
              <FacilityMap
                v-if="m.map_json"
                class="map-inside"
                :pageUid="pageUid"
                :mapJson="m.map_json" />
            </div>
          </div>
        </template>

        <!-- ローディング中バブル -->
        <div v-if="chat.loading" class="bot-row">
          <img :src="botIconSrc" 
               class="bot-icon"
               @error="handleImageError" />
          <div class="bubble bubble-bot typing">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
        <div class="padding" ref="bottom"></div>
      </div>
    </div>

    <!-- 入力バー -->
    <form class="input-bar" @submit.prevent="submit">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="input"
        :placeholder="t('chat.placeholder')"
        rows="1"
        style="overflow:hidden;resize:none;"
        @keydown.meta.enter.prevent="submit"
      ></textarea>

      <button type="submit" class="send-btn">
        <span class="material-symbols-outlined filled send">send</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { useRoute }            from 'vue-router'
import { useChatStore }        from '@/stores/chat'
import { useDesignStore }      from '@/stores/design'
import defaultIcon             from '@/assets/images/default_icon.png'
import { useAppStore }         from '@/stores/info'
import { storeToRefs }         from 'pinia'
import { useViewportHeight } from '@/composables/useFooterHeight'
import { useI18n } from 'vue-i18n'   // 追加
import FacilityMap from '@/components/FacilityMap.vue'
const { t } = useI18n()              // 追加


useViewportHeight()
const targetUrl   = import.meta.env.VITE_API_BASE        // ↔ API_TARGET
const cacheStamp = Date.now()      // キャッシュ回避用タイムスタンプ

const GCS_BASE   = 'https://storage.googleapis.com/'               // fixed
const GCS_BUCKET = 'tabiguide_uploads'                              // bucket name


/* ─── ストアから施設情報を取得 ─── */
const appStore = useAppStore()
const { appInfo } = storeToRefs(appStore)

/* ─── ルート＆ユーティリティ ─── */
const route   = useRoute()
const pageUid = route.params.pageUid ?? 'DEMO'

/* ─── 初回＆言語変更でフェッチ ─── */
onMounted(async () => {
  chat.init(pageUid)      // ★ greeting をセット
  chat.setMode('chat')
  await appStore.getInfo()

  // DEBUG: initial map message
  // chat.messages.unshift({
  //   role:'bot',
  //   text:'施設マップはこちらです',
  //   map_json:{ map:'1', pins:[{x_pct:42.3, y_pct:75.8, label:'シャンプー' }] }
  // })
})

/* ─── 施設名の computed （fallback 付き） ─── */
const facilityName = computed(() => {
  // JSON のキーが base.name か base['施設名'] どちらかに合わせてください
  const b = appInfo.value?.base || {}
  return b.name || b['施設名'] || ''
})

const headerLogoSrc = computed(() => {
  if (appInfo.value?.design?.header_logo_url)
    return `${appInfo.value.design.header_logo_url}?v=${cacheStamp}`

  if (pageUid)
    return `${GCS_BASE}${GCS_BUCKET}/upload/${pageUid}/images/header_logo.png?v=${cacheStamp}`

  return `${targetUrl}/upload/${pageUid}/images/header_logo.png?v=${cacheStamp}`
})

const botIconSrc = computed(() => {
  if (appInfo.value?.design?.icon_url)
    return `${appInfo.value.design.icon_url}?v=${cacheStamp}`

  if (pageUid)
    return `${GCS_BASE}${GCS_BUCKET}/upload/${pageUid}/images/icon.png?v=${cacheStamp}`

  return `${targetUrl}/upload/${pageUid}/images/icon.png?v=${cacheStamp}`
})

/* デザインストアから読み取り */
const designStore = useDesignStore()

/* ---------- 状態 ---------- */
const chat      = useChatStore()
chat.setMode('chat')
const inputText = ref('')
const userId    = localStorage.getItem('chat_user_id') || 
  'anon-' + Math.random().toString(36).slice(2,8)
localStorage.setItem('chat_user_id', userId)
const inputRef = ref(null)

watch(inputText, () => nextTick(autoResize))

function autoResize () {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'          // いったんリセット
  const max = 120                   // 最大高さ(px) ＝ 約6行
  el.style.height = Math.min(el.scrollHeight , max) + 'px'
}

/* 初期ロード */

/* helper */
function nl2br(txt = '') {
  return (txt ?? '').toString().replace(/\n/g, '<br>')
}

function botText(m) {
  const raw = m.text ?? m.message ?? m.content ?? ''
  return typeof raw === 'string'
    ? raw
    : JSON.stringify(raw, null, 2)
    console.log(facilityData)
}

/* 送信 */
function submit() {
  if (!inputText.value.trim()) return
  chat.send(pageUid, userId, inputText.value.trim())
  inputText.value = ''
  autoResize()
}

/* 自動スクロール */
const bottom = ref(null)
watch(
  () => [chat.messages.length, chat.loading],
  async () => {
    await nextTick()
    const messageWrap = document.getElementById('message_wrap')
    if (messageWrap) {
      messageWrap.scrollTop = messageWrap.scrollHeight
    }
  },
  { flush: 'post' }
)

const showFacilityName = ref(true)

function handleHeaderImageError(e) {
  if (!e.target.dataset.fallback) {
    e.target.dataset.fallback = '1'
    e.target.src = `${targetUrl}/upload/${pageUid}/images/header_logo.png`
  } else {
    e.target.style.display = 'none'
    showFacilityName.value = true
  }
}

function handleHeaderImageLoad() {
  showFacilityName.value = false
}

function handleImageError(e) {
  if (!e.target.dataset.fallback) {
    e.target.dataset.fallback = '1'
    e.target.src = `${targetUrl}/upload/${pageUid}/images/icon.png`
  } else {
    e.target.src = defaultIcon
  }
}
</script>

<style>
.chat-wrap {
  height: var( --100vh );
  display: flex;
  flex-direction: column;
}

#chat_header {
  width: 100%;
  position: sticky;
  top: 0;
  height: 55px;
  background: var(--primary-color);
  z-index: 10;
  box-sizing: border-box;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo {
  height: 100%;
  width: auto;
  object-fit: contain;
}

#chat_header .name {
  line-height: 35px;
  height: 35px;
  display: inline-block;
  font-weight: bold;
  vertical-align: middle;
  color: var(--header-text-color);
}

#message_wrap {
  flex: 1;
  overflow-y:scroll;
  padding-bottom: calc(60px + var(--fh)); /* input-bar + footerの高さ分の余白 */
}

.msg-list {
  display: flex; 
  flex-direction: column; 
  gap: 10px;
  overflow-y: scroll;
  padding: 14px 12px 0; 
  box-sizing: border-box;
}

.bubble {
  clear: both; 
  display: inline-block;
  max-width: 75%; 
  padding: 8px 12px;
  border-radius: 10px; 
  font-size: 14px;
  line-height: 1.6; 
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0,0,0,.1)
}

.bubble-user {
  margin-left: auto; 
  background: var(--user-message-color);  /* ピンク背景 */
  color: var(--user-text-color);         /* 白テキスト */
  border-radius: 10px 0 10px 10px; 
  align-self: flex-end;
  float: right;
}

.bubble-bot {
  align-self: flex-start; 
  background: var(--bot-message-color);  /* 茶色背景 */
  color: var(--bot-text-color);         /* 白テキスト */
  border-top-left-radius: 0;
}

.bot-row { display: flex; align-items: flex-start; gap: 6px; }
.bot-icon {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; 
  /* border: solid 1px var(--secondary-color); */
  background: white;
}

.bot-icon-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
  word-break: break-all;
}

.typing { display: flex; gap: 4px; align-items: center; padding: 8px 14px; }
.dot {
  width: 6px; height: 6px; border-radius: 50%; 
  background: var(--secondary-color);
  animation: blink 1.4s infinite ease-in-out both;
}
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%,80%,100% { opacity: .25 } 40% { opacity: 1 } }

.input-bar {
  position: sticky;
  bottom: var(--fh);
  left: 0;
  right: 0;
  display: flex;
  gap: 8px;
  padding: 5px;
  /* padding-bottom: calc(10px + var(--safe-area-inset-bottom)); */
  background: var(--input-background-color);
  border-top: none;
  box-shadow: none;
  z-index: 10;
  border-top: solid 1px #dcdcdc;
  box-sizing: border-box;
}

.input {
  width: calc(100% - 50px);
  font-size: 16px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  box-shadow: none;
  background: white;
  line-height: 25px;
  border: solid 1px #dcdcdc;
  box-shadow:  2px 2px 3px rgba(0,0,0,.05) inset;
}

.send-btn {
  height: 40px;
  width: 45px;
  border: none;
  border-radius: 6px;
  color: var(--send-button-color);  /* 送信ボタンのアイコン色 */
  background: var(--send-button-bg-color);  /* 送信ボタンの背景色 */
  place-items: center;
  cursor: pointer;
}

.send-btn .send {
  line-height: 34px;
  font-size: 30px;
}

.send-btn span {
  font-size: 22px;
}

.call-link {                /* 電話ボタン */
  margin-left:auto;         /* 右端寄せ */
  display:flex; align-items:center;
  padding:4px; border-radius:6px;
}

.phone {
  font-size:28px;
  font-variation-settings:'FILL' 1,'GRAD' 0,'opsz' 48;
  color:var(--header-text-color);
}
</style>

/* map inside bubble */
.map-inside{
  display:block;
  margin-top:6px;
}

.map-inside .map-bubble{
  max-width:100%;
}
