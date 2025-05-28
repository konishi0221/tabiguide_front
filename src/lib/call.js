// src/lib/call.js
import { ref } from 'vue'
import axios   from 'axios'

/* ---------- 定数 ---------- */
const isIOS         = /iP(hone|od|ad)/.test(navigator.userAgent)
const FORCE_WHISPER = import.meta.env.VITE_FORCE_WHISPER === 'true' ||
                      window.FORCE_WHISPER === true
const silenceGap   = 0.5            // 無音閾値（秒）
const levelThresh  = 5// 無音レベル (0-128)
const OPENAI_KEY   = import.meta.env.VITE_OPENAI_API_KEY
const GCP_TTS_KEY  = import.meta.env.VITE_GOOGLE_MAPS_KEY

let lastSpokenText = ''             // 直前の TTS


/* ---------- ファクトリ ---------- */
export function createCall ({
  pageUid      = '',
  chatStore    = null,
  audioElement = null,
  greet        = '',
  lang         = 'ja-JP',
  voiceName    = 'ja-JP-Wavenet-A'
}) {
  const phase = ref('idle')
  let   active = false
  let   recog  = null               // PC 用 SpeechRecognition
  let   micStream  = null;

  /* ---- Google TTS ---- */
  async function speak (text) {
    if (!text) return
    phase.value = 'speaking'
    const body = {
      input : { text: text.slice(0, 5000) },
      voice : { languageCode: lang, name: voiceName },
      audioConfig: { audioEncoding:'MP3', speakingRate:1.2 }
    }
    const { data } = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCP_TTS_KEY}`,
      body
    )
    audioElement.src = `data:audio/mp3;base64,${data.audioContent}`
    await new Promise(ok => { audioElement.onended = ok; audioElement.play().catch(ok) })
    await new Promise(r => setTimeout(r, 200))   // 残響逃がし
    lastSpokenText = text
    audioElement.removeAttribute('src'); audioElement.load()
    phase.value = 'idle'
  }

  /* ---- Whisper STT (iOS / 強制) ---- */
  async function listenIOS () {
    const blob = await recordUntilSilence(silenceGap)
  
    if (blob.size < 15000) return ''  // 無音なら送らない
  
    const fd = new FormData()
    fd.append('model', 'whisper-1')
    fd.append('file', new File([blob], 'audio.webm', { type:'audio/webm' }))
    fd.append('language', lang.slice(0,2))
  
    const { data } = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      fd,
      { headers:{ Authorization:`Bearer ${OPENAI_KEY}` } }
    )
  
    let txt = (data.text || '').trim()
  
    // ── ノイズ判定（無音時に出てくる不要フレーズを完全に除去） ──
    const noise = [
      'by H.',
      'ご視聴ありがとうございました。'
    ]
    // フレーズ単体で全文が一致する場合も含め、部分一致したら無視
    if (noise.some(n => txt.includes(n))) {
      // console.log('[listenIOS] ノイズ検出:', txt)
      return ''
    }
  
    // 前回と同じなら無視
    if (txt === lastSpokenText) {
      return ''
    }
  
    // console.log('IOS :', txt)
    return txt
  }
  
  /* ---- PC/Android: Web Speech ---- */
  function listenWeb () {
    return new Promise(res => {
      const API = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!API) return res('')
      phase.value = 'listening'
      recog = new API()
      recog.lang = lang
      recog.interimResults = false
      recog.continuous     = false
      recog.onresult = e => {
        const txt = e.results[0][0].transcript.trim()
        phase.value = 'idle'
        // console.log('WEB :' + txt)
        res(txt === lastSpokenText ? '' : txt)
      }
      const end = () => { phase.value = 'idle'; res('') }
      recog.onerror = end; recog.onend = end; recog.start()
    })
  }

  /* ---- STT エントリ ---- */
  function listen () {
    if (isIOS || FORCE_WHISPER) return listenIOS()
    return listenWeb()
  }

  /* ---- 無音で切る録音 ---- */
  function recordUntilSilence (gap) {
    return new Promise(async resolve => {
      // const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
      micStream = await navigator.mediaDevices.getUserMedia({ audio:true })
      const stream = micStream

      const ctx  = new AudioContext()
      const src  = ctx.createMediaStreamSource(stream)
      const ana  = ctx.createAnalyser()
      ana.fftSize = 2048; src.connect(ana)
      const buf = new Uint8Array(ana.fftSize)
      const rec = new MediaRecorder(stream, { mimeType:'audio/webm' })
      const chunks=[]; rec.ondataavailable=e=>chunks.push(e.data)
      rec.start()
      let silent=0
      const iv=setInterval(()=>{
        ana.getByteTimeDomainData(buf)
        const vol = Math.max(...buf)-128
        silent = vol < levelThresh ? silent+50 : 0
        if (silent >= gap*1000){ clearInterval(iv); rec.stop() }
      },50)
      // rec.onstop = () => resolve(new Blob(chunks,{ type:'audio/webm' }))
      rec.onstop = () => {
        // 録音終了時にマイクを解放
        if (micStream) {
          micStream.getTracks().forEach(t => t.stop());
          micStream = null;
        }
        // 収集したチャンクから Blob を生成して返す
        const blob = new Blob(chunks, { type: 'audio/webm' });
        resolve(blob);
      };

    })
  }

  /* ---- GPT ---- */
  async function askGPT (text) {
    const r = await chatStore.send(pageUid, chatStore.userId, text)
    return r?.message || r
  }

  /* ---- ループ ---- */
  async function loop () {
    if (!active) return
    const user = await listen()
    if (!user) return loop()
    const reply = await askGPT(user)
    await speak(reply)
    loop()
  }

  /* ---- 外部 API ---- */
  async function start () {
    if (active) return
    active = true
    try {
      const permStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permStream.getTracks().forEach(t => t.stop());  
      // await navigator.mediaDevices.getUserMedia({ audio:true }) 
    }
    catch { stop(); return }
    if (greet) await speak(greet)
    loop()
  }
  function stop () {
    active = false
    recog?.abort()
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop())
        micStream = null
    }
    audioElement.pause(); audioElement.currentTime = 0
    phase.value = 'idle'
  }

  return { start, stop, phase }
}
