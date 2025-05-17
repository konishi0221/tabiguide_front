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
     * @param {string} [lang='ja'] - 言語コード（例 'en'）
     */
    async fetch(pageUid, lang = 'ja') {
      if (!pageUid) return
      try {
        const response = await axios.get('/api/design.php', {
          params: { page_uid: pageUid }
        })
        // design_jsonカラムからデータを取得
        if (response.data && response.data.design_json) {
          try {
            this.data = typeof response.data.design_json === 'string' 
              ? JSON.parse(response.data.design_json) 
              : response.data.design_json
          } catch (parseError) {
            console.error('Failed to parse design_json:', parseError)
            this.data = {}
          }
        } else {
          this.data = {}
        }
      } catch (e) {
        console.error('Failed to load design data:', e)
      }
    }
  }
})
