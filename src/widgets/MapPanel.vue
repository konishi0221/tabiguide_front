<template>
  <article
    ref="panel"
    class="mp"
    :class="{
      hidden: !point || state === 'hidden',
      half:   state === 'half',
      full:   state === 'full'
    }"
  >
    <header
      class="hdr"
      @click="state === 'half' ? stateChange('full') : stateChange('half')"
      @mousedown="handleDown"
      @mouseup="handleUp"
      @touchstart.passive="handleDown"
      @touchend="handleUp"
    >
      <div class="handle"></div>
      <h2 class="ttl">{{ point?.name || '' }}</h2>
      <button class="cls" @click.stop="close()">
        <span class="material-symbols-outlined">close</span>
      </button>
    </header>

    <section class="bod" v-if="point">
      <!-- 画像サムネ -->
      <div
        v-if="imgExists"
        class="thumb"
        :style="{ backgroundImage: `url(${imgUrl})` }"
      ></div>

      <!-- 説明文 -->
      <p v-if="point.description" class="jp-desc">
        {{ point.description }}
      </p>

      <!-- 公式サイト -->
      <p v-if="point.url" class="url">
        <a
          :href="point.url"
          target="_blank"
          rel="noopener"
        >{{ t('map.panel.websiteLink') }}</a>
      </p>

      <!-- Google Maps -->
      <p v-if="point.lat && point.lng" class="gmap">
        <a
          :href="`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`"
          target="_blank"
          rel="noopener"
        >{{ t('map.panel.googleMapLink') }}</a>
      </p>
    </section>
  </article>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useViewportHeight } from '@/composables/useFooterHeight'
useViewportHeight()

const props = defineProps({
  point: Object,
  pageUid: String
})
const emit = defineEmits(['update:point'])
const { t } = useI18n()

// Reactive reference to props.point
const { point } = toRefs(props)
const state = ref('hidden')
const panel = ref(null)

// サムネイルURL
const imgUrl = computed(() => {
  const p = props.point
  if (!p?.facility_uid || !p?.uid) return ''
  return `/upload/${p.facility_uid}/stores/${p.uid}.jpg`
})

// 存在チェック - 一時的に常にtrueを返す
const imgExists = ref(true)

// 半分/全画面切り替え
watch(
  () => point.value,
  (newVal) => {
    if (newVal) state.value = 'half'
  }
)

// 初期化
onMounted(() => {
  recalcHeights()
  window.addEventListener('resize', recalcHeights)
})

function stateChange(val) {
  state.value = val || 'hidden'
}
function close() {
  state.value = 'hidden'
  emit('update:point', null)
}

// フッター高さなど再計算
let footerPx = 0, fullHeight = 0, halfHeight = 0
function recalcHeights() {
  footerPx = document.getElementById('tab-bar')?.offsetHeight || 0
  fullHeight = window.innerHeight - footerPx
  halfHeight = fullHeight * 0.5
  document.documentElement.style.setProperty('--fh', `${footerPx}px`)
}

// ドラッグ操作
let startY = 0, startHeight = 0
function handleDown(e) {
  const evtY = e.touches ? e.touches[0].pageY : e.pageY
  startHeight = parseFloat(getComputedStyle(panel.value).height)
  startY = evtY
  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleUp)
  window.addEventListener('touchmove', handleMove, { passive: false })
  window.addEventListener('touchend', handleUp)
}
function handleMove(e) {
  const currentY = e.touches ? e.touches[0].pageY : e.pageY
  const diff = currentY - startY
  let newHeight = startHeight - diff
  if (newHeight >= halfHeight) {
    newHeight = Math.min(newHeight, fullHeight)
    panel.value.style.height = `${newHeight}px`
    panel.value.style.bottom = `${footerPx}px`
    return e.preventDefault()
  }
  const minBottom = -1 * (window.innerHeight * 0.5 - footerPx)
  panel.value.style.height = `${halfHeight}px`
  panel.value.style.bottom = `${Math.max(minBottom, footerPx - (diff - (startHeight - halfHeight)))}px`
  e.preventDefault()
}
function handleUp(e) {
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('mouseup', handleUp)
  window.removeEventListener('touchmove', handleMove)
  window.removeEventListener('touchend', handleUp)
  const endY = e.changedTouches ? e.changedTouches[0].pageY : e.pageY
  const diff = endY - startY
  const SNAP = 40
  const downThreshold = state.value === 'full' ? SNAP * 2 : SNAP
  if (diff > downThreshold) {
    close()
  } else if (diff < -SNAP) {
    state.value = 'full'
  } else {
    state.value = 'half'
  }
  panel.value.style.height = ''
  panel.value.style.bottom = ''
}
</script>

<style>
:root {
  --fh: 56px;
  --radius: 18px;
  --shadow: 0 8px 24px rgba(0,0,0,.18);
  --gray: #666;
  --blue: #0066ff;
  --100vh: 100vh;
}
.mp {
  position: fixed; left: 0; right: 0;
  bottom: calc(50vh * -1);
  height: calc(50vh - var(--fh));
  background: #fff;
  border-radius: 18px 18px 0 0;
  box-shadow: var(--shadow);
  display: flex; flex-direction: column;
  transition: bottom .28s ease, height .28s ease;
  z-index: 100;
  box-sizing: border-box;
}
.mp.hidden { bottom: calc(50vh * -1); }
.mp.half   { bottom: var(--fh); }
.mp.full   {
  bottom: calc(var(--fh) );
  height: calc(var(--100vh) - var(--fh) );
}
.hdr {
  display: flex; align-items: center; gap: .85rem;
  padding: 10px 10px 0; cursor: grab;
  border-bottom: 1px solid #dcdcdc;
  position: relative;
}
.hdr:active { cursor: grabbing; }
.handle {
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  width: 48px; height: 5px; border-radius: 4px;
  background: #d0d0d0;
}
.ttl { flex: 1; font-weight: 600; font-size: 1rem; color: #222; }
.cls {
  width: 36px; height: 36px;
  border: none; border-radius: 50%;
}
.cls:hover { background: #e0e0e0; }
.bod {
  flex: 1; overflow-y: auto; padding: 10px;
  font: 400 .925rem/1.7 "Noto Sans JP", sans-serif;
  color: #333;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.thumb {
  width: 100%;
  padding-bottom: 35%;
  margin-bottom: 12px;
  background-size: cover;
  background-position: center;
  transition: all 200ms;
  border-radius: 8px;
  overflow: hidden;
}
.full .thumb { padding-bottom: 70%; }
.jp-desc { margin: .2rem 0 1rem; }
.url a, .gmap a {
  display: block; text-align: center; padding: 5px 0;
  border: 1px solid; color: var(--blue);
  margin: 10px auto; width: calc(100% - 20px);
}
.url a:hover, .gmap a:hover {
  background: #f9f9f9;
}
</style>
