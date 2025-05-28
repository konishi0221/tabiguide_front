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
  : 'https://tabiguide.net/'               // 本番環境

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

/* 会話履歴を取得
   before に最古メッセージ id を渡すとそれ以前を追加取得
   @return [{id, role, msg_text, map_json, created_at}, ...]
*/
export async function fetchHistory (pageUid, chatId, limit = 40, before = 0) {
  const res = await api.get(
    apiUrl + '/api/chat/GetHistory.php',
    { params: { page_uid: pageUid, chat_id: chatId, limit, before } }
  )
  return res.data
}

/* ユーザーのメッセージを送り、Bot の応答を受け取る */
export async function sendMessage (pageUid, chatId, text, datas = {}) {
  const res = await api.post(
    apiUrl + '/api/chat.php',
    {
      pageUid,
      userId  : chatId,
      message : text,
      lang    : datas.lang,
      mode    : datas.mode
    },
    { withCredentials: true }
  )
  return res.data
}

export function fetchChatSetting (pageUid, lang = 'ja') {

  // console.log(lang)

  return api
    .get( apiUrl + '/api/chat_setting.php', { params: { page_uid: pageUid, lang } })
    .then(res => res.data) // { chat_charactor, chat_first_message }
}
