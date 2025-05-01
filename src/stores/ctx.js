// stores/ctx.js
import { defineStore } from 'pinia'

export const useCtxStore = defineStore('ctx', {
  state: () => ({
    pageUid: '',
    chatId: '',
    lang: 'ja',
    stage: '予約前ゲスト',
    // 他必要なプロパティ
  }),
  actions: {
    initCtx(initData) {
      Object.assign(this, initData)
    },
    setLang(lang) {
      this.lang = lang
    },
  }
})
