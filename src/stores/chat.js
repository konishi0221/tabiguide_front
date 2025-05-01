/* ---------- imports ---------- */
import { defineStore } from 'pinia'
import { fetchHistory, sendMessage, fetchChatSetting } from '@/lib/api'
import { genRandomId } from '@/lib/until'
import { useToast }    from 'vue-toastification'
import { useRoute }    from 'vue-router'

/* ---------- キーと初期値 ---------- */
const pageUid  = useRoute.pageUid
const CTX_KEY  = pageUid => `tg_ctx_${pageUid}`
const CTX_EMPTY = {
  chatId      : '',
  lang        : 'ja',
  bookingName : '',
  stage       : '',           // pre | stay | post
  charactor   : 'ふつうの丁寧語',
  name        : '',           // ユーザー名
  room_name   : '',           // 部屋名
  checkInDate : '',           // チェックイン日
  checkOutDate: '',           // チェックアウト日
  guestCount  : '',           // 宿泊人数
  specialRequests: ''         // 特別な要望
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages : [],
    loading  : false,
    ctx      : { ...CTX_EMPTY }
  }),

  actions: {
    /* ---------- 初期化 ---------- */
    async  init (pageUid){
      const key = CTX_KEY(pageUid)
      const savedCtx = JSON.parse(localStorage.getItem(key) || 'null')

      // 保存されたctxがある場合は、CTX_EMPTYとマージ
      this.ctx = savedCtx ? { ...CTX_EMPTY, ...savedCtx } : { ...CTX_EMPTY }

      if (!this.ctx.chatId) {
        this.ctx.chatId = genRandomId()
      }

      try{
        // チャット履歴を取得
        const history = await fetchHistory(pageUid, this.ctx.chatId)

        // 履歴データを適切な形式に変換
        this.messages = history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'bot',
          text: msg.content,
          viaTool: false
        })) || []

        const dsg = await fetchChatSetting(pageUid, this.ctx.lang)
        this.ctx.charactor = dsg.chat_charactor
        this.firstGreeting = dsg.chat_first_message || 'こんにちは！ご質問があればどうぞ！'

        // 履歴が空の場合のみ初期メッセージを追加
        if (!this.messages.length) {
          this.messages = [{
            role: 'bot',
            text: this.firstGreeting,
            viaTool: false
          }]
        }

        return {
          role: 'bot',
          text: this.firstGreeting,
          viaTool: false
        }
  
      }catch(e){
        this.firstGreeting = 'こんにちは！ご質問があればどうぞ！'
        this.messages = [{
          role: 'bot',
          text: this.firstGreeting,
          viaTool: false
        }]
      }

      localStorage.setItem(key, JSON.stringify(this.ctx))
    },

    /* ---------- 送信 ---------- */
    async send (pageUid, userId, text){
      const toast = useToast()

      // console.group('Chat Message Send')
      // console.log('Request:', { pageUid, userId, text })

      // メッセージを追加（最大40件を維持）
      this.messages.push({ role:'user', text, viaTool:false })
      if (this.messages.length > 40) {
        this.messages = this.messages.slice(-40)
      }

      this.loading = true
      try{
        // コンテキストに現在のメッセージ履歴を含める
        const contextWithHistory = {
          ...this.ctx,
          messages: this.messages
        }

        // console.group('API Call')
        // console.log('Context:', this.ctx)
        // console.log('Messages:', this.messages)
        // console.log('Full context with history:', contextWithHistory)

        const data = await sendMessage(pageUid, userId, text, contextWithHistory)
        // console.log(data)
        console.groupEnd()

        // すべてのctx更新をまとめて処理
        let ctxUpdates = {}

        if (Array.isArray(data.via_tool)) {
            console.group('Tools')
            console.log('Tools used:', data.via_tool)
            data.via_tool.forEach((v, index) => {
              console.log(`Tool ${index + 1}:`, v)
              if (v.name === 'updateCtx') {
                    try {
                        const newCtx = JSON.parse(v.arguments)
                        console.log('New context updates:', newCtx)
                        ctxUpdates = { ...ctxUpdates, ...newCtx }
                    } catch (e) {
                        console.error('Error parsing updateCtx arguments:', e)
                    }
                }
            })
            // console.groupEnd()

            // まとめた更新を一度に適用
            if (Object.keys(ctxUpdates).length > 0) {
                // console.log('Applying context updates:', ctxUpdates)
                // this.updateCtx(pageUid, ctxUpdates)
              }
          }

        if (data.staff_called) {
            toast.success('スタッフに連絡しました！')
        }

        

        // ボットの応答を追加（最大40件を維持）
        this.messages.push({
          role    : 'bot',
          text    : data.message,
          viaTool : data.via_tool,
          function_call: data.function_call
        })
        if (this.messages.length > 40) {
          this.messages = this.messages.slice(-40)
        }

        return data


      }catch(err){
        console.group('Error')
        console.error('Error details:', err)
        console.error('Response:', err.response?.data)
        console.groupEnd()
        const msg = err.response?.data?.error || err.message || '通信エラー'
        toast.error(msg)
      }finally{
        this.loading = false
        console.groupEnd()
      }

    },

    /* ---------- ctx を更新 ---------- */
    async updateCtx (pageUid, patch) {
      const key = CTX_KEY(pageUid)

      /* ctx が未取得のときはストレージから復元してからマージ */
      if (!this.ctx || typeof this.ctx !== 'object') {
        const savedCtx = JSON.parse(localStorage.getItem(key) || 'null')
        this.ctx = savedCtx ? { ...CTX_EMPTY, ...savedCtx } : { ...CTX_EMPTY }
      }

      const prevLang = this.ctx.lang
      // patchを先に適用し、その後でCTX_EMPTYの構造を確保
      const updatedCtx = { ...this.ctx, ...patch }
      this.ctx = { ...updatedCtx }

      localStorage.setItem(key, JSON.stringify(this.ctx))

      if (patch.lang && patch.lang !== prevLang) {
        try {
          const dsg = await fetchChatSetting(pageUid, patch.lang)
          this.ctx.charactor = dsg.chat_charactor
          this.firstGreeting = dsg.chat_first_message
        } catch (e) {
          // エラー処理
        }
      }
    }
  }
})
