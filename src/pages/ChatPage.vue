<template>
  <div class="chat-wrap">

    <div id="chat_header">
      <div class="name">{{ facilityName }}</div>
    </div>
    <!-- <div id="chat_header_padding"></div> -->


    <!-- ▸ メッセージ一覧 -->
    <div id="message_wrap">
      <div ref="listRef" class="msg-list">
        <template v-for="(m,i) in chat.messages" :key="i">
          <div :class="m.role==='bot' ? 'bot-row' : ''">
            <img v-if="m.role==='bot'" :src="botIconSrc" class="bot-icon" />
            <div
              :class="['bubble', m.role==='bot' ? 'bubble-bot' : 'bubble-user']"
              v-html="nl2br(m.role==='bot' ? botText(m) : m.text)" />
          </div>
        </template>

        <!-- ローディング中バブル -->
        <div v-if="chat.loading" class="bot-row">
          <img :src="botIconSrc" class="bot-icon" />
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
        placeholder="メッセージを入力"
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
useViewportHeight()

/* ─── ストアから施設情報を取得 ─── */
const appStore = useAppStore()
const { appInfo } = storeToRefs(appStore)

/* ─── ルート＆ユーティリティ ─── */
const route   = useRoute()
const pageUid = route.params.pageUid ?? 'DEMO'

/* ─── 初回＆言語変更でフェッチ ─── */
onMounted(() => {
  appStore.getInfo()
})

/* ─── 施設名の computed （fallback 付き） ─── */
const facilityName = computed(() => {
  // JSON のキーが base.name か base['施設名'] どちらかに合わせてください
  const b = appInfo.value?.base || {}
  return b.name || b['施設名'] || ''
})





/* ---------- 状態 ---------- */
const chat      = useChatStore()
const inputText = ref('')
const userId    = localStorage.getItem('chat_user_id') || 
  'anon-' + Math.random().toString(36).slice(2,8)
localStorage.setItem('chat_user_id', userId)
const inputRef = ref(null)

/* デザインストアから読み取り */
const designStore = useDesignStore()
const botIconSrc  = computed(() => {
  return designStore.data.logo_base64
    ? `data:image/png;base64,${designStore.data.logo_base64}`
    : defaultIcon
})

watch(inputText, () => nextTick(autoResize))

function autoResize () {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'          // いったんリセット
  const max = 120                   // 最大高さ(px) ＝ 約6行
  el.style.height = Math.min(el.scrollHeight , max) + 'px'
}





/* 初期ロード */
chat.init(pageUid, userId)

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
</script>

<style >
:root {
  --fh: 56px;
  --radius: 18px;
  --shadow: 0 8px 24px rgba(0,0,0,.18);
  --gray: #666;
  --blue: #0066ff;
  --100vh: 100vh;
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}

.chat-wrap {
  height: calc( 100vh );
  display: flex;
  flex-direction: column;
}

#chat_header {
  width:100%;
  position: sticky;
  top:0;
  height: 55px;
  background:white;
  z-index: 10;
  box-sizing:border-box;
  padding: 10px;
  vertical-align: middle;
}

#chat_header .name {
  line-height: 35px;
  height: 35px;
  display:inline-block;
  font-weight: bold;
  vertical-align:middle;
}
#message_wrap {
  flex: 1;
  overflow-y:scroll;
  padding-bottom: calc(60px + var(--fh)); /* input-bar + footerの高さ分の余白 */
}
.msg-list {
  display: flex; flex-direction: column; gap: 10px;
  overflow-y: scroll;
  padding: 14px 12px 0; box-sizing: border-box;
}
.bubble {
  clear: both; display: inline-block;
  max-width: 75%; padding: 8px 12px;
  border-radius: 10px; font-size: 14px;
  line-height: 1.6; word-break: break-word;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.bubble-user {
  margin-left: auto; background: #0066ff; color: #fff;
  border-radius: 10px 0 10px 10px; align-self: flex-end;
  float: right;
}
.bubble-bot {
  align-self: flex-start; background:#6b6b6b;
  color: #fff;
  border-top-left-radius: 0;
}
.bot-row { display: flex; align-items: flex-start; gap: 6px; }
.bot-icon {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; border: solid 1px #dcdcdc;
}
.typing { display: flex; gap: 4px; align-items: center; padding: 8px 14px; }
.dot {
  width: 6px; height: 6px; border-radius: 50%; background: #bbb;
  animation: blink 1.4s infinite ease-in-out both;
}
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%,80%,100% { opacity: .25 } 40% { opacity: 1 } }

.input-bar {
  position: sticky;
  bottom: var(--fh); /* footerの高さ分上に配置 */
  left: 0;
  right: 0;
  display: flex;
  gap: 8px;
  padding: 10px;
  padding-bottom: calc(10px + var(--safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #ddd;
  box-shadow: 0 -2px 10px rgba(0,0,0,.1);
  z-index: 10;
}

.input {
  width:calc(100% - 50px);
  font-size: 16px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,.1) inset;
  font-size:16px;
  padding:6px 10px;
  line-height:1.4;
}

.send-btn {
  height: 34px;
  width: 45px;
  border: none;
  border-radius: 6px;
  color: #0066ff;
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

/* iPhoneのホームバーがある場合の対応 */
@supports (padding: max(0px)) {
  .input-bar {
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
}
</style>
