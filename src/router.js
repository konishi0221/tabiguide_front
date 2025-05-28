import { createRouter, createWebHistory } from 'vue-router'
import ChatPage from './pages/ChatPage.vue'
import MapPage from './pages/MapPage/MapPage.vue'
import InfoPage from './pages/InfoPage.vue'
import CallPage from './pages/CallPage.vue'
import LoginPage from './pages/LoginPage.vue'
import LanguageSettings from './pages/LanguageSettings.vue'
import { useChatStore } from './stores/chat'    // adjust path if alias exists

// ---------- canonical redirect ----------
if (
  location.host.endsWith('.run.app') &&          // Cloud Run default domain
  !location.host.startsWith('localhost') &&      // dev server
  !location.host.startsWith('127.0.0.1')
) {
  location.replace(
    'https://app.tabiguide.net' +
      location.pathname +
      location.search +
      location.hash
  );
}
// ---------- end canonical redirect ----------

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/:pageUid',      component: ChatPage,  name: 'chat'  },
    { path: '/:pageUid/map',  component: MapPage,   name: 'map'   },
    { path: '/:pageUid/info', component: InfoPage,  name: 'info'  },
    { path: '/:pageUid/langage', component: LanguageSettings,  name: 'langage'  },
    { path: '/:pageUid/call',          name: 'call', component: CallPage },
    { path: '/:pageUid/login',          name: 'login', component: LoginPage }
  ]
});

// ------- room param handler -------
router.beforeEach(async (to, from) => {
  const pageUid = to.params.pageUid
  const roomUid = to.query.room

  const chat = useChatStore()
  const userId = chat.userId || ''

  if (!roomUid) {
    return true           // proceed normally
  }

  const url = `/api/ctx_update.php` +
              `?mode=room` +
              `&page_uid=${encodeURIComponent(pageUid)}` +
              `&room_uid=${encodeURIComponent(roomUid)}` +
              (userId ? `&user_id=${encodeURIComponent(userId)}` : '')
  try {
    await fetch(url, { method: 'POST' })
  } catch (e) {
    console.error('ctx_update error', e)
  }

  // redirect to clean URL without query
  // return { path: `/${pageUid}`, hash: to.hash }
})
// ------- end handler -------

export default router
