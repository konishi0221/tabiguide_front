<!-- src/pages/CallPage.vue -->
<template>

  <div id="call">
    <img :src="`${targetUrl}/upload/${pageUid}/images/icon.png`"
         id="facility_icon"
         @error="handleImageError" />
    <p id="facility_name">{{ facilityName }}</p>

    <p id="time_count" v-if="timerDisp">{{ time_format(time) }}</p>
    <div id="time_count" v-else-if="active">
      <div id="setting_load" class="typing">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>

    <button id="call_icon" :class="active ? 'call' : 'close'" @click="toggle">
      <audio ref="audioPlayer" />
      <span class="material-symbols-outlined text-3xl call">
        {{ active ? 'close' : 'call' }}
      </span>
    </button>

    <div id="call_text">{{ t('call.callLabel') }}</div>
    <div v-if="debugLogs.length" id="mic_debug">
  <div v-for="(l,i) in debugLogs" :key="i">{{ l }}</div>
</div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount ,watch } from 'vue'
import { storeToRefs }   from 'pinia'
import { useChatStore }  from '@/stores/chat'
import { useAppStore }   from '@/stores/info'
import { useRoute }      from 'vue-router'
import { useI18n }       from 'vue-i18n'
import defaultIcon       from '@/assets/images/default_icon.png'
import { createCall }    from '@/lib/call.js'
import { getOption }     from '@/lib/callOption.js'

const phase = ref('idle')   // ← 追加


const timerDisp = ref(false)   // 今は使わなくてもダミーで用意
const time      = ref(0)
const debugLogs = ref([])      // デバッグ表示用

/* ---------- const ---------- */
const { t }     = useI18n()
const route     = useRoute()
const pageUid   = route.params.pageUid || route.query.pageUid || ''
const targetUrl = import.meta.env.VITE_API_BASE
const TTS_KEY   = import.meta.env.VITE_GOOGLE_MAPS_KEY

/* ---------- stores ---------- */
const chat = useChatStore()

chat.setMode('voice')

const { appInfo } = storeToRefs(useAppStore())

/* ---------- state ---------- */
const facilityName = computed(() => {
  const b = appInfo.value?.base || {}
  return b.name || b['施設名'] || ''
})
const active     = ref(false)
const callState  = ref('idle')

/* ---------- refs ---------- */
const audioPlayer = ref(null)

/* ---------- helpers ---------- */
function handleImageError (e) { e.target.src = defaultIcon }

/* ---------- call ---------- */
let call = null
function toggle () {
  if (!call) return
  active.value ? call.stop() : call.start()
  active.value = !active.value
}



/* ---------- lifecycle ---------- */
onMounted(async () => {
  await chat.init(pageUid)
  await useAppStore().getInfo()

  /* opts は chat.init 後に生成 */
  const opts = getOption({
    lang  : chat.lang,
    greet : chat.messages[0]?.text || '',
    debug : import.meta.env.DEV
  })

  call = createCall({
    pageUid,
    chatStore   : chat,
    audioElement: audioPlayer.value,
    ttsKey      : TTS_KEY,
    ...opts
  })
  phase.value = call.phase.value          // 初期値
  watch(call.phase, v => phase.value = v) // 反映


  // call.on((ev) => { if (ev === 'state') callState.value = ev })
})

onBeforeUnmount(() => { call?.stop() })
</script>


<style >

#call {
  height: var( --100vh - var(--fh) );
  position: sticky;
  width: calc(100%);
}
#facility_icon {
  display: block;
  border-radius: 500px;
  /* border: solid 1px #dcdcdc; */
  max-width: calc(250px);
  width: calc(30%);
  margin: auto;
  margin-top: 30%;
  background-color: white;
  box-shadow: var(--shadow) ;
}

#facility_name {
  text-align: center;
  margin-top: 10px;
}

#call_icon {
  display: block;
  border-radius: 500px;
  width: calc(70px);
  height: 70px;
  background: var(--primary-color);
  position: fixed;
  bottom: 150px;
  left: 50%;
  transform: translateX(-50%);
  -webkit-transform: translateX(-50%);
  box-shadow: var(--shadow);
}
#call_icon .call {
  font-variation-settings: 
    'FILL' 1,   /* 塗りつぶし */
    'GRAD' 0,
    'opsz' 48;

  color: var(--tab-text-color);
}

#call_text {
  bottom: 120px;
  display: block;
  position: fixed;
  text-align: center;
  width: calc(100%);
}


#time_count {
  text-align: center;
  margin-top: 20px;
}
#setting_load.typing {
  text-align: center;
  display: block;
}

#setting_load .dot {
  display: inline-block;
  width: 6px; height: 6px; border-radius: 50%; 
  background: var(--secondary-color);
  animation: blink 1.4s infinite ease-in-out both;
  /* background-color: red; */
  margin: 3px;
}
#setting_load .dot:nth-child(2) { animation-delay: .2s; }
#setting_load .dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%,80%,100% { opacity: .25 } 40% { opacity: 1 } }
</style>
