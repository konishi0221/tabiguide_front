/* ---------- src/stores/chat.js ---------- */
import { defineStore } from 'pinia'
import { fetchHistory, sendMessage, fetchChatSetting } from '@/lib/api'
import { genRandomId } from '@/lib/until'
import { useToast } from 'vue-toastification'

const LANG_KEY   = p => `tg_lang_${p}`
const CHATID_KEY = p => `tg_chatid_${p}`

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages : [],
    loading  : false,
    lang     : 'ja',
    chatId   : '',
    mode     : 'chat',                   // ← 追加: 画面側で切替
    userId   : localStorage.getItem('chat_user_id') ||
               'anon-' + Math.random().toString(36).slice(2,8)
  }),

  actions: {
    /**
     * 最新 limit 件の履歴を取得
     */
    async loadHistory (pageUid, limit = 20){
      try{
        const rows = await fetchHistory(pageUid, this.userId, limit)
        console.log('[chat] fetchHistory raw =', rows)   // ← 常にログ
        if (Array.isArray(rows) && rows.length){
          // 古い順
          rows.sort((a,b)=> a.id - b.id).forEach(r=>{
            const mappedRole = (r.role === 'assistant') ? 'bot'
                              : (r.role === 'user' ? 'user'
                              : r.role)            // そのまま fallback
            this.messages.push({
              id      : r.id,           // ← 追加: メッセージID
              role    : mappedRole,
              text    : r.msg_text,
              map_json: r.map_json ?? null,
              viaTool : false
            })
          })
          return true
        } else {
          console.log('[chat] history is empty')
        }
      }catch(e){
        console.warn('[chat] history fetch error:', e.message)
      }
      return false
    },

    /**
     * さらに過去の履歴を取得（スクロール時）
     */
    async loadMore(pageUid, limit = 20){
      if (!this.messages.length) return
      const oldestId = this.messages[0].id    // 先頭行の id
      try{
        const rows = await fetchHistory(pageUid, this.userId, limit, oldestId)
        if (Array.isArray(rows) && rows.length){
          rows.sort((a,b)=> a.id - b.id).forEach(r=>{
            const mappedRole = (r.role === 'assistant') ? 'bot'
                              : (r.role === 'user' ? 'user' : r.role)
            this.messages.unshift({
              id      : r.id,
              role    : mappedRole,
              text    : r.msg_text,
              map_json: r.map_json ?? null,
              viaTool : false
            })
          })
        }
      }catch(e){
        console.warn('[chat] loadMore fetch error:', e.message)
      }
    },

    async init (pageUid){
      // ページ固有 → 全体共通 'lang' → 既定
      if (!localStorage.getItem('chat_user_id')) {
        localStorage.setItem('chat_user_id', this.userId)
      }
      this.lang   = localStorage.getItem(LANG_KEY(pageUid))
                 || localStorage.getItem('lang')
                 || this.lang
      this.chatId = localStorage.getItem(CHATID_KEY(pageUid)) || ''

      if (!this.chatId){
        this.chatId = genRandomId()
        localStorage.setItem(CHATID_KEY(pageUid), this.chatId)
      }

      // ① 直近20行の履歴を先に読み込む
      const hasHist = await this.loadHistory(pageUid, 20)
      if (hasHist) return    // 履歴だけ入れて終了

      // ② 履歴が無いときは greeting を入れる
      try{
        const dsg = await fetchChatSetting(pageUid, this.lang)
        const greeting = this.mode === 'voice'
          ? (dsg.voice_first_message || dsg.chat_first_message)
          : (dsg.chat_first_message || dsg.voice_first_message)
          || 'こんにちは！ご質問があればどうぞ！'

        this.messages = [{
          role:'bot', text:greeting, map_json:null, viaTool:false
        }]
      }catch{
        this.messages = [{
          role:'bot', text:'こんにちは！ご質問があればどうぞ！', viaTool:false
        }]
      }
    },

    setLang (pageUid, lang){        /* vue-i18n 側は呼び出し元で変更 */
      this.lang = lang
      localStorage.setItem(LANG_KEY(pageUid), lang)
      localStorage.setItem('lang', lang)      // detectLang() と同期
    },
    setMode (mode){          // 'chat' | 'voice'
      this.mode = mode
    },
    

    async send (pageUid, userId, text){
      const toast = useToast()
      const isLogin = localStorage.getItem('login') === 'true'

      console.log('[chat send] userId =', this.userId, 'login =', isLogin)

      this.messages.push({ id: Date.now(), role:'user', text, viaTool:false })
      if (this.messages.length > 40) this.messages = this.messages.slice(-40)
      // console.log(this.mode)

      this.loading = true
      try{
        const data = await sendMessage(pageUid, userId, text, {
          lang     : this.lang,
          chatId   : this.chatId,
          mode     : this.mode,
          login    : isLogin
        })

        console.log(data)
        // console.log(data.ctx)

        if (data.staff_called) toast.success('スタッフに連絡しました！')

        // parse map_json (string -> object) and log for debug
        let mj = null
        if (data.map_json) {
          try {
            mj = (typeof data.map_json === 'string')
              ? JSON.parse(data.map_json)
              : data.map_json
          } catch (e) {
            console.warn('map_json parse error:', e, data.map_json)
          }
        }
        console.log('bot map_json =', mj)

        this.messages.push({
          id     : data.msg_id || Date.now(),   // APIで返さない場合は暫定
          role   :'bot',
          text   : data.message,
          map_json : mj,
          viaTool: data.via_tool
        })
        if (this.messages.length > 40) this.messages = this.messages.slice(-40)

        return data
      }catch(err){
        const msg = err.response?.data?.error || err.message || '通信エラー'
        toast.error(msg)
      }finally{
        this.loading = false
      }
    }
  }
})
