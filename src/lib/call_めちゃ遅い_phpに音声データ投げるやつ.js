// src/lib/call.js

import { ref } from 'vue'
import axios   from 'axios'
import { attachFilters, recordUntilSilence } from './soundFilter.js'

/* ---- 既定言語を localStorage.lang から取得 ---- */
// lang は localStorage.lang に保存された短縮コード (ja,en,ko…)
const storedLang = localStorage.getItem('lang') || 'ja'

/* ---- 短縮コード → デフォルト WaveNet voice ---- */
const voiceMap = {
  ja : 'ja-JP-Wavenet-A',
  en : 'en-US-Wavenet-A',
  ko : 'ko-KR-Wavenet-A',
  zh : 'cmn-CN-Wavenet-A',
  zht: 'cmn-TW-Wavenet-A',
  th : 'th-TH-Wavenet-A',
  vi : 'vi-VN-Wavenet-A',
  id : 'id-ID-Wavenet-A',
  es : 'es-ES-Wavenet-D'
}

/* ---------- 定数 ---------- */
const isIOS         = /iP(hone|od|ad)/.test(navigator.userAgent)
const FORCE_WHISPER = import.meta.env.VITE_FORCE_WHISPER === 'true' ||
                      window.FORCE_WHISPER === true
const silenceGap   = 0.5            // 無音閾値（秒）
const levelThresh  = 8  // 無音レベル (0-128) iOS でノイズ抑制

let lastSpokenText = ''             // 直前の TTS
let greeted = false            // 最初のあいさつ再生済みフラグ


/* ---------- ファクトリ ---------- */
export function createCall ({
  pageUid      = '',
  userId       = '',
  chatStore    = null,
  audioElement = null,
  greet        = '',
  lang         = storedLang,
  voiceName    = voiceMap[lang] || 'ja-JP-Wavenet-A'
}) {
  const phase = ref('idle')
  let   active = false
  let   recog  = null               // PC 用 SpeechRecognition

  const user_id =ref(userId)

  /* ---- Whisper STT (iOS / 強制) ---- */
  async function listenIOS () {
    const blob = await recordUntilSilence(silenceGap)
    if (!blob) return null                 // 無音・雑音で除外

    if (blob.size < 30000 && blob.duration < 1000) return null  // 無音扱い
    return blob                             // 音声あり
  }
  
  /* ---- STT エントリ ---- */
  function listen () {
    return listenIOS()        // 端末問わず Blob を返す
  }


  /* ---- 最初のあいさつ再生 ---- */
  async function playGreet () {
    if (greet === '' || greeted) return
    try {
      const fd = new FormData()
      fd.append('uid',  pageUid)
      fd.append('lang', lang)
      fd.append('text', greet)
      fd.append('mode', 'tts')   // backend で text→TTS のみ処理

      const { data } = await axios.post('/api/voice_chat.php', fd, {
        headers: { 'Content-Type':'multipart/form-data' }
      })
      if (data?.audio) {
        phase.value = 'speaking'
        audioElement.src = data.audio
        greeted = true
        await new Promise(ok => { audioElement.onended = ok; audioElement.play().catch(ok) })
        phase.value = 'idle'
      }
    } catch (e) {
      console.error('playGreet error', e)
    }
  }
  

  /* ---- unified voice_chat API ---- */
  async function voiceChat (blob) {
    // console.log(blob)
    // console.log(user_id.value)

    const fd = new FormData()
    fd.append('uid', pageUid)
    fd.append('user_id', user_id.value)
    fd.append('lang', lang)
    const ext  = (blob.type.split('/')[1] || 'webm').replace(/;.*$/, '');
    fd.append('audio', new File([blob], `voice.${ext}`, { type: blob.type }));

    const { data } = await axios.post('/api/voice_chat.php', fd, {
      headers: { 'Content-Type':'multipart/form-data' }
    })
    return data 
  }

  /* ---- ループ ---- */
  async function loop () {
    if (!active) return
    const blob = await listen()
    if (!active) return            // stop() 中に録音完了したとき
    if (!blob) return loop()       // 無音はスキップ

    const res = await voiceChat(blob)
    // console.log('[voiceChat RES]', res)
    if (!res?.audio) return loop()

    /* ---------- チャットログ更新 (user / bot) ---------- */
    const pushMsg = msg => {
      if (typeof chatStore.append === 'function') chatStore.append(msg)
      else if (Array.isArray(chatStore))          chatStore.push(msg)
      else if (chatStore?.messages &&
               Array.isArray(chatStore.messages)) chatStore.messages.push(msg)
    }

    // Whisper で認識したユーザー発話
    if (res.user) {
      pushMsg({
        uid: pageUid,
        role: 'user',
        text: res.user,
        viaTool: false
      })
    }

    // Bot 発言 (bot または text キー)
    const botText = res.bot ?? res.text
    if (botText) {
      pushMsg({
        uid: pageUid,
        role: 'bot',
        text: botText,
        viaTool: !!res.viaTool
      })
    }

    // --- debug: current chatStore state ---
    console.log('[chatStore]', chatStore.messages ?? chatStore)
    phase.value = 'speaking'
    audioElement.src = res.audio
    await new Promise(ok => { audioElement.onended = ok; audioElement.play().catch(ok) })
    await new Promise(r => setTimeout(r, 200))
    phase.value = 'idle'
    if (!active) return          // stop() で終了
    loop()
  }

  /* ---- 外部 API ---- */
  async function start () {
    if (active) return
    active = true
    try {
      const permStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permStream.getTracks().forEach(t => t.stop());
    } catch { stop(); return }

    await playGreet()          // ★ ここで最初の挨拶を再生
    loop()
  }
  function stop () {
    active = false
    recog?.abort()
    audioElement.pause(); audioElement.currentTime = 0
    phase.value = 'idle'
  }

  return { start, stop, phase }
}
