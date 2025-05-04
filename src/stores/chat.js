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
    userId   : localStorage.getItem('chat_user_id') ||
               'anon-' + Math.random().toString(36).slice(2,8)
  }),

  actions: {
    async init (pageUid){
      localStorage.setItem('chat_user_id', this.userId)
      this.lang   = localStorage.getItem(LANG_KEY(pageUid))   || this.lang
      this.chatId = localStorage.getItem(CHATID_KEY(pageUid)) || ''

      if (!this.chatId){
        this.chatId = genRandomId()
        localStorage.setItem(CHATID_KEY(pageUid), this.chatId)
      }

      try{
        const history = await fetchHistory(pageUid, this.chatId)
        this.messages = history.map(h => ({
          role    : h.role === 'user' ? 'user' : 'bot',
          text    : h.content,
          viaTool : false
        }))

        if (!this.messages.length){
          const dsg = await fetchChatSetting(pageUid, this.lang)
          const greeting = dsg.chat_first_message || 'こんにちは！ご質問があればどうぞ！'
          this.messages.push({ role:'bot', text:greeting, viaTool:false })
        }
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

    async send (pageUid, userId, text){
      const toast = useToast()

      this.messages.push({ role:'user', text, viaTool:false })
      if (this.messages.length > 40) this.messages = this.messages.slice(-40)

      this.loading = true
      try{
        const data = await sendMessage(pageUid, userId, text, {
          lang     : this.lang,
          chatId   : this.chatId,
          messages : this.messages
        })
        console.log(data)

        if (data.staff_called) toast.success('スタッフに連絡しました！')

        this.messages.push({ role:'bot', text:data.message, viaTool:data.via_tool })
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
