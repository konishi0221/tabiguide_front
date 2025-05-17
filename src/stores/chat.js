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
    async init (pageUid){
      localStorage.setItem('chat_user_id', this.userId)
      console.log('init :' + this.userId )
      // ページ固有 → 全体共通 'lang' → 既定
      this.lang   = localStorage.getItem(LANG_KEY(pageUid))
                 || localStorage.getItem('lang')
                 || this.lang
      this.chatId = localStorage.getItem(CHATID_KEY(pageUid)) || ''

      if (!this.chatId){
        this.chatId = genRandomId()
        localStorage.setItem(CHATID_KEY(pageUid), this.chatId)
      }

      try{
        // const history = await fetchHistory(pageUid, this.chatId)
        // this.messages = history.map(h => ({
        //   role    : h.role === 'user' ? 'user' : 'bot',
        //   text    : h.content,
        //   viaTool : false
        // }))

        const dsg = await fetchChatSetting(pageUid, this.lang)
        // モードによって最初のメッセージを切り替え
        const greeting = this.mode === 'voice'
        ? (dsg.voice_first_message || dsg.chat_first_message)
        : (dsg.chat_first_message || dsg.voice_first_message)
        || 'こんにちは！ご質問があればどうぞ！'

        // ---- debug ----
        
        // 履歴モードは無いので必ず greeting から開始
        this.messages = [{
          role:'bot',
          text:greeting,
          map_json:null,
          viaTool:false
        }]
      }catch{
        this.messages = [{
          role:'bot',
          text:'こんにちは！ご質問があればどうぞ！',
          viaTool:false
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

      this.messages.push({ role:'user', text, viaTool:false })
      if (this.messages.length > 40) this.messages = this.messages.slice(-40)
      // console.log(this.mode)

      this.loading = true
      try{
        const data = await sendMessage(pageUid, userId, text, {
          lang     : this.lang,
          chatId   : this.chatId,
          mode     : this.mode
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
