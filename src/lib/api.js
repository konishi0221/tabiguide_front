/* src/lib/api.js
   ──────────────────────────────────────────
   チャット用 API ラッパー
   ------------------------------------------ */
import axios from 'axios'

/* 共通 axios インスタンス  */
const api = axios.create({
  headers : { 'Content-Type': 'application/json' },
  timeout : 15_000                       // 15 秒でタイムアウト
})

// APIのベースURL設定
const apiUrl = import.meta.env.DEV 
  ? 'http://localhost:8080'              // 開発環境
  : 'https://tabiguide-service-364524278619.asia-northeast1.run.app/'               // 本番環境

api.interceptors.response.use(
  res => res,                                  // 2xx はそのまま
  err => {
    if (err.response) {
      /* 4xx / 5xx のとき：内容をコンソール確認 */
      console.error('[API]', err.response.status, err.response.data)
    } else {
      /* レスポンスが無い：ネットワーク系 or JSON 変換エラー */
      console.error('[Network]', err.message)
    }
    return Promise.reject(err)                 // 上位の catch へ
  }
)

/* 会話履歴を取得（チャット画面初期化時） */
export async function fetchHistory (pageUid, userId) {
  const res = await api.post( apiUrl + '/api/chat.php', {
    pageUid,
    userId,
    mode : 'history'                     // PHP 側で履歴取得を判定
  })
  return res.data;  // 履歴データを直接返す
}

/* ユーザーのメッセージを送り、Bot の応答を受け取る */
export async function sendMessage (pageUid, chatId, text, ctx) {
  /* await は async 関数内なので有効になる */
  const res = await api.post( apiUrl + '/api/chat.php', {
    pageUid,
    userId      : chatId,
    message     : text,
    lang        : ctx.lang,
    stage       : ctx.stage,
    name        : ctx.name,
    bookingName : ctx.bookingName,
    room_name   : ctx.room_name,      
    charactor   : ctx.charactor,
    mode        : 'chat',
    messages    : ctx.messages  // 会話履歴を追加
  })

  /* axios の data 部だけ返す */
  return res.data;
}

export function fetchChatSetting (pageUid, lang = 'ja') {
  return api
    .get( apiUrl + '/api/chat_setting.php', { params: { page_uid: pageUid, lang } })
    .then(res => res.data) // { chat_charactor, chat_first_message }
}
