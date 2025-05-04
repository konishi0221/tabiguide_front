// src/lib/tts.js
import axios from 'axios'

/* ---- 言語 → デフォルト voice ---- */
export const voiceMap = {
  'ja-JP': 'voice_ja',
  'en-US': 'voice_en',
  'ko-KR': 'voice_ko',
  'zh-CN': 'voice_zh',
  'es-ES': 'voice_es'
}

/**
 * OpenAI Text-to-Speech (model tts-1) 再生
 * @param {String} text
 * @param {Object} opts
 * @param {HTMLAudioElement} opts.audioEl  <audio> 要素
 * @param {String} [opts.lang='ja-JP']
 * @param {String} [opts.voice]           モデル voice (未指定は voiceMap)
 * @param {Number} [opts.rate=1.0]        読み上げ速度
 * @returns {Promise<void>}
 */
export async function speak (text, {
  audioEl,
  lang  = 'ja-JP',
  voice = voiceMap[lang] || 'voice_ja',
  rate  = 1.0
} = {}) {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (!text || !key || !audioEl) return

  const { data } = await axios.post(
    'https://api.openai.com/v1/audio/speech',
    {
      model  : 'tts-1',
      input  : text.slice(0, 4096),
      voice,
      speed  : rate,
      format : 'mp3'
    },
    {
      responseType : 'arraybuffer',
      headers      : { Authorization: `Bearer ${key}` }
    }
  )

  const blob = new Blob([data], { type:'audio/mp3' })
  audioEl.src = URL.createObjectURL(blob)

  await new Promise(res => {
    audioEl.onended = res
    audioEl.play().catch(res)
  })

  URL.revokeObjectURL(audioEl.src)
  audioEl.removeAttribute('src')
  audioEl.load()
}
