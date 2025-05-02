<template>
  <div id="call">
    <img :src="`${targetUrl}/upload/${pageUid}/images/icon.png`" 
         id="facility_icon"
         @error="handleImageError" />
    <p id='facility_name'>{{ facilityName }}</p>
    <p id='time_count' v-if="timerDisp">{{ time_format(time) }}</p>
    <div id='time_count' v-if="!timerDisp && active " >
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
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useRoute } from 'vue-router'
import defaultIcon from '@/assets/images/default_icon.png'
import { useAppStore } from '@/stores/info'
import axios from 'axios'
import { useI18n } from 'vue-i18n'   // 追加
const { t } = useI18n()              // 追加

const targetUrl = import.meta.env.VITE_API_BASE
const GOOGLE_TTS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const chat = useChatStore()
const route = useRoute()
const pageUid = route.params.pageUid || route.query.pageUid || ''
const userId = chat.ctx.chatId
const userLang = localStorage.getItem('lang')


const appStore = useAppStore()
const { appInfo } = storeToRefs(appStore)
const facilityName = computed(() => {
  // JSON のキーが base.name か base['施設名'] どちらかに合わせてください
  const b = appInfo.value?.base || {}
  return b.name || b['施設名'] || ''
})




const time = ref('')
const timer = ref(null)
const timerDisp = ref(false)



function time_format(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60

  const pad = n => n.toString().padStart(2, '0')

  return h > 0
    ? `${h}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`
}


const active = ref(false)
let recog = null
let unlocked = false
const pendingReplies = []
const voiceText = ref('')
const audioPlayer = ref(null)
const lang = ref('ja-JP')
const botChara = ref('')

function langToSpeech(lang) {
  const map = { ja: 'ja-JP', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN', zht: 'zh-TW', th: 'th-TH', vi: 'vi-VN', id: 'id-ID', es: 'es-ES' }
  return map[lang] || 'ja-JP'
}

function langToSpeechVoice(lang) {
  const voiceMap = {
    'ja-JP': 'ja-JP-Wavenet-A',
    'en-US': 'en-US-Wavenet-A',
    'ko-KR': 'ko-KR-Wavenet-A',
    'zh-CN': 'cmn-CN-Wavenet-A',
    'zh-TW': 'cmn-TW-Wavenet-A',
    'th-TH': 'th-TH-Wavenet-A',
    'vi-VN': 'vi-VN-Wavenet-A',
    'id-ID': 'id-ID-Wavenet-A',
    'es-ES': 'es-ES-Wavenet-D',
  }  
  return voiceMap[lang] || 'en-US-Wavenet-A'
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

onMounted(async () => {
  const init = await chat.init(pageUid)
  voiceText.value = init.text
  lang.value = langToSpeech(userLang)
  botChara.value = langToSpeechVoice(lang.value)
  await useAppStore().getInfo()
})

function unlockGesture() {
  if (unlocked) return
  unlocked = true
  audioCtx.resume().catch(()=>{})
  while(pendingReplies.length) speakByGoogle(pendingReplies.shift())
}

function timer_start() {
  console.log('スタート')
  timerDisp.value = true
  timer.value = setInterval(() => { time.value++ }, 1000)
}

function timer_end() {
  clearInterval(timer.value)
  timerDisp.value = false
  timer.value = null
  time.value = ""
  console.log('終わり')
}

function startRec() {
  speakByGoogle(voiceText.value)
  const API = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!API) return console.warn('Web Speech API not supported')
  
  recog = new API()
  recog.continuous = true
  recog.lang = lang.value
  recog.onresult = async ({ results }) => {
    if (audioPlayer.value && !audioPlayer.value.paused) {
      audioPlayer.value.pause()  
      audioPlayer.value.currentTime = 0
    }

    const last = results[results.length - 1]
    if (!last.isFinal) return
    const txt = last[0].transcript.trim()
    if (!txt) return
    const res = await chat.send(pageUid, userId, txt)
    const reply = res?.message || res
    unlocked ? speakByGoogle(reply) : pendingReplies.push(reply)
  }
  recog.start()
}

function handleImageError(e) {
  e.target.src = defaultIcon
}

function stopRec() {
  recog?.stop()
  recog = null
  audioPlayer.value.pause()
  audioPlayer.value.currentTime = 0
  timer_end()
}

function toggle() {
  unlockGesture()
  active.value ? stopRec() : startRec()
  active.value = !active.value
}

async function speakByGoogle(text) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`
  const body = {
    input: { text: text.slice(0, 5000) },
    voice: { languageCode: lang.value, name: botChara.value },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.2 }
  }

  console.log(langToSpeechVoice(lang.value))

  try {
    const { data } = await axios.post(url, body)

    if (timerDisp.value == false ) {
      timer_start()
    }

    if (!data.audioContent) return console.error('[TTS] missing audioContent', data)
    if (audioPlayer.value && active.value) {
      audioPlayer.value.src = `data:audio/mp3;base64,${data.audioContent}`
      await audioPlayer.value.play()
    }
  } catch (err) {
    console.error('[TTS] axios error', err)
  }
}
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
