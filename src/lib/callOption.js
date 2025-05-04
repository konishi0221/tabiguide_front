// src/lib/callOption.js
/* -----------------------------------------------------------
   通話ロジック用オプションを一元管理
   ----------------------------------------------------------- */

/* ---- 言語 → SpeechRecognition/TTS コード ---- */
export const langMap = {
    ja : 'ja-JP',
    en : 'en-US',
    ko : 'ko-KR',
    zh : 'zh-CN',
    zht: 'zh-TW',
    th : 'th-TH',
    vi : 'vi-VN',
    id : 'id-ID',
    es : 'es-ES'
  }
  
  /* ---- TTS 音声キャラ ---- */
  export const voiceMap = {
    'ja-JP': 'ja-JP-Wavenet-A',
    'en-US': 'en-US-Wavenet-A',
    'ko-KR': 'ko-KR-Wavenet-A',
    'zh-CN': 'cmn-CN-Wavenet-A',
    'zh-TW': 'cmn-TW-Wavenet-A',
    'th-TH': 'th-TH-Wavenet-A',
    'vi-VN': 'vi-VN-Wavenet-A',
    'id-ID': 'id-ID-Wavenet-A',
    'es-ES': 'es-ES-Wavenet-D'
  }
  
  /* -----------------------------------------------------------
     getOption() で createCall() に渡す設定オブジェクトを生成
     ----------------------------------------------------------- */
  export function getOption ({
    lang   = 'ja',            // 短縮言語コード
    greet  = '',              // 初回あいさつ（'' で無効）
    debug  = false            // デバッグログ
  } = {}) {
    const lcode     = langMap[lang] || 'ja-JP'
    const voiceName = voiceMap[lcode] || 'en-US-Wavenet-A'
  
    return {
      greet,                  // 例: 'いらっしゃいませ'
      sttLang  : lcode,       // SpeechRecognition.lang
      ttsLang  : lcode,       // TTS languageCode
      voiceName,              // TTS voice name
      debug                    // true でコンソール出力
    }
  }
  