// src/stores/info.js
import { defineStore } from 'pinia'
import axios            from 'axios'
import router           from '@/router'
import { detectLang }   from '@/lib/lang'

export const useAppStore = defineStore('app', {
  state: () => ({
    appInfo: { base: {}, geo: {} },
    loading: false
  }),
  getters: {
    facilityName: (state) => {
      console.log('getter facilityName:', state.appInfo.base)
      return state.appInfo.base?.name ?? '...'
    }
    },
  actions: {
    async getInfo() {
      // ページ UID と言語をストア内で取得
      const to      = router.currentRoute.value
      const uid     = to.params.pageUid || to.query.pageUid
      const lang    = detectLang()

      if (!uid) return
      this.loading = true
      try {
        const url = import.meta.env.PROD
          ? `${import.meta.env.VITE_API_BASE}/api/facility.php`
          : '/api/facility.php'
        const { data } = await axios.get(url, {
          params: { page_uid: uid, lang }
        })
        this.appInfo = {
          base: JSON.parse(data.base_data || '{}'),
          geo:  JSON.parse(data.geo_data  || '{}')
        }
      } catch (e) {
        console.error('facility load error', e)
      } finally {
        this.loading = false
      }
    }
  }
})
