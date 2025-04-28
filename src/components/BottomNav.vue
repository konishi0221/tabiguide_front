<!-- src/components/BottomNav.vue -->
<template>
  <nav id="tab-bar">
    <RouterLink
      :to="makeLink('chat')"
      class="tab-btn"
      :class="{ active: isActive('chat') }"
    >
    <span class="material-symbols-outlined icon">chat</span>
      <span class="txt">{{ t('bottomBar.chat') }}</span>
    </RouterLink>

    <RouterLink
      :to="makeLink('map')"
      class="tab-btn"
      :class="{ active: isActive('map') }"
    >
      <span class="material-symbols-outlined icon">map</span>
      <span class="txt">{{ t('bottomBar.map') }}</span>
    </RouterLink>

    <RouterLink
      :to="makeLink('info')"
      class="tab-btn"
      :class="{ active: isActive('info') }"
    >
      <span class="material-symbols-outlined icon">info</span>
      <span class="txt">{{ t('bottomBar.info') }}</span>
    </RouterLink>

    <RouterLink
      :to="makeLink('langage')"
      class="tab-btn"
      :class="{ active: isActive('langage') }"
    >
      <span class="material-symbols-outlined icon">translate</span>
      <span class="txt">{{ t('bottomBar.language') }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'   // 追加

const { t } = useI18n()              // 追加

const route = useRoute()

function makeLink(name) {
  const uid = route.params.pageUid ?? 'DEMO'
  return { name, params: { pageUid: uid } }
}

function isActive(name) {
  return route.name === name
}
</script>

<style>
#tab-bar{
  position:fixed;
  bottom:0; left:0; right:0;
  height:55px;                      /* = 3rem */
  background:black;
  display:flex;
  justify-content:space-around;
  align-items:center;
  font-size:10px;
  z-index:1000;
  paddiing-bottom:20px;
}

.tab-btn{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:2px;
  color: white;
  border-radius:8px;
  transition:background .2s,color .2s;
  text-decoration:none;          /* RouterLink → <a> */
  width:45px;
  height:45px;
}
.tab-btn .icon{
  font-size:25px;
  line-height:30px;
  height: 30px;
  display:block;    /* サイズ制御を確実に */
  vertical-align: center;
} /* 20 px = Tailwind text‑lg */
span.txt{
  font-size:8px;
  line-height: 8px;
} /* 20 px = Tailwind text‑lg */

.tab-btn.active{
  background: white;            /* pink‑100 近似 */
  color:black;                 /* pink‑600 近似 */
}
</style>
