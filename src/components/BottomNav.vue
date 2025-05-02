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
      :to="makeLink('call')"
      class="tab-btn"
      :class="{ active: isActive('call') }"
    >
      <span class="material-symbols-outlined icon">support_agent</span>
      <span class="txt">{{ t('bottomBar.call') }}</span>
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
  bottom:0; 
  left:0; 
  right:0;
  height:55px;
  background: var(--secondary-color);  /* 紺色背景 */
  display:flex;
  justify-content:space-around;
  align-items:center;
  font-size:10px;
  z-index:1000;
  /* padding-bottom:20px; */
  position:fixed;
}



.tab-btn{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:2px;
  color: var(--tab-text-color);  /* 半透明白 */
  border-radius:8px;
  transition:background .2s,color .2s;
  text-decoration:none;
  width:45px;
  height:45px;
  opacity: 0.5;
  font-weight: 100;
  padding-bottom: 20px;
}
.tab-btn .icon{
  font-size:25px;
  line-height:30px;
  height: 30px;
  display:block;    /* サイズ制御を確実に */
  font-variation-settings:
  'FILL' 0,
  'wght' 100,
  'GRAD' 0;
}

/* 20 px = Tailwind text‑lg */
span.txt{
  font-size:8px;
  line-height: 8px;
} /* 20 px = Tailwind text‑lg */

.tab-btn.active{
  opacity: 1;
  font-weight: bold;
}
.tab-btn.active span.txt{
  font-weight: bold;
}
.tab-btn.active .icon{
  font-weight: 700;
  font-variation-settings:
  'FILL' 1,
  'wght' 400,
  'GRAD' 0,
  'opsz' 24;
}
</style>
