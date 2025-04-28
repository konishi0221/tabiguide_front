// src/stores/design.js
import { defineStore } from 'pinia'
import axios from 'axios'

export const useDesignStore = defineStore('design', {
  state: () => ({
    data: {}        // API から取得したデザイン設定を保持
  }),
  actions: {
    /**
     * design API を叩いてデザイン設定を取得・保存する
     * @param {string} pageUid - ページUID
     */
    async fetch(pageUid) {
      if (!pageUid) return
      try {
        const response = await axios.get('/api/design.php', {
          params: { page_uid: pageUid }
        })
        this.data = response.data || {}
      } catch (e) {
        console.error('Failed to load design data:', e)
      }
    }
  }
})
