// // src/lib/googleTts.js

// // 環境変数名を VITE_GOOGLE_MAPS_KEY に変更
// const GOOGLE_TTS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// /**
//  * Google Cloud TTS を呼び出し、WaveNet 音声を再生する
//  * iOS/Safari の自動再生制限にも対応
//  */

// export async function speakByGoogle(text) {
//   if (!text?.trim()) return

//   // REST エンドポイント
//   const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`
//   const body = {
//     input:      { text: text.slice(0, 5000) },
//     voice:      { languageCode: 'ja-JP', name: 'ja-JP-Wavenet-C' },
//     audioConfig:{ audioEncoding: 'MP3', speakingRate: 1.0 }
//   }

//   let audioContent
//   try {
//     const response = await fetch(url, {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body:    JSON.stringify(body)
//     })
//     if (!response.ok) {
//       console.error('[TTS] HTTP error', response.status, response.statusText)
//       return
//     }
//     const data = await response.json()
//     audioContent = data.audioContent
//     if (!audioContent) {
//       console.error('[TTS] missing audioContent', data)
//       return
//     }
//   } catch (err) {
//     console.error('[TTS] fetch error', err)
//     return
//   }

//   // data:URI で Audio を作成
//   const player = new Audio(`data:audio/mp3;base64,${audioContent}`)
//   return new Promise(resolve => {
//     player.onended = resolve
//     player.onerror = resolve
//     setTimeout(() => {
//       player.play().catch(() => resolve())
//     }, 0)
//   })
// }
