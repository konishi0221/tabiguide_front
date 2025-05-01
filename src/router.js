import { createRouter, createWebHistory } from 'vue-router'
import ChatPage from './pages/ChatPage.vue'
import MapPage from './pages/MapPage/MapPage.vue'
import InfoPage from './pages/InfoPage.vue'
import CallPage from './pages/CallPage.vue'
import LanguageSettings from './pages/LanguageSettings.vue'

export default createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/:pageUid',      component: ChatPage,  name: 'chat'  },
    { path: '/:pageUid/map',  component: MapPage,   name: 'map'   },
    { path: '/:pageUid/info', component: InfoPage,  name: 'info'  },
    { path: '/:pageUid/langage', component: LanguageSettings,  name: 'langage'  },
    { path: '/:pageUid/call',          name: 'call', component: CallPage }
  ]
})
