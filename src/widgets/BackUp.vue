<!-- src/widgets/MapPanel.vue -->
<template>
  <article
    ref="panel"
    class="mp"
    :class="state"
    @mousedown="dragStart"
    @touchstart.passive="dragStart"
  >
    <!-- ⬇ point があれば中⾝を描画 -->
    <template v-if="point">
      <header class="hdr">
        <div class="handle"></div>
        <span class="material-symbols-outlined ico" :style="{ color: cat.color }">
          {{ cat.icon }}
        </span>
        <h2 class="ttl">{{ point.name }}</h2>
        <button class="cls" @click="closeByTap">
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>

      <section class="bod">
        ダミー説明テキスト…（長文になってもスクロール出来ます）
      </section>
    </template>
  </article>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted } from 'vue'

/* props / emits */
const emit  = defineEmits(['close'])
const props = defineProps({ point: Object, categories: Array })

/* category */
const cat = computed(() =>
  props.point && props.categories.find(c => c.id === props.point.cat))

/* 状態: 'hidden' | 'half' | 'full' */
const state = ref('hidden')

/* footer ⾼さを CSS 変数へセット */
function setFooterVar () {
  const fh = document.getElementById('tab-bar')?.offsetHeight || 0
  document.documentElement.style.setProperty('--fh', `${fh}px`)
}

/* 初期化 */
onMounted(() => {
  setFooterVar()
  window.addEventListener('resize', setFooterVar)
})

/* point truthy / falsy → half / hidden */
watchEffect(() => {
  state.value = props.point ? 'half' : 'hidden'
})

/* close helpers */
function closeByTap () { state.value = 'hidden'; emit('close') }

/* ─ drag ─ */
let startY = 0
let startState = 'half'
function dragStart (e) {
  if (!props.point) return
  startState = state.value
  startY     = (e.touches ? e.touches[0] : e).pageY
  window.addEventListener('mousemove', dragMove)
  window.addEventListener('mouseup',   dragEnd)
  window.addEventListener('touchmove', dragMove, { passive:false })
  window.addEventListener('touchend',  dragEnd)
}
function dragMove (e) {
  const diff = (e.touches ? e.touches[0] : e).pageY - startY
  const dir  = diff > 40 ? 'down' : diff < -40 ? 'up' : null
  if (dir === 'down') state.value = 'hidden'
  if (dir === 'up')   state.value = 'full'
  e.preventDefault()
}
function dragEnd () {
  window.removeEventListener('mousemove', dragMove)
  window.removeEventListener('mouseup',   dragEnd)
  window.removeEventListener('touchmove', dragMove)
  window.removeEventListener('touchend',  dragEnd)
}
</script>

<style scoped>
/* パネル本体 */
.mp{
  position:fixed;
  left:0; right:0;
  bottom:var(--fh,0);            /* footer の直上に張り付く */
  height:calc(100vh - var(--fh,0));
  background:#fff;
  border-radius:16px 16px 0 0;
  box-shadow:0 -2px 4px rgba(0,0,0,.1);
  display:flex; flex-direction:column;
  will-change:transform;
  z-index:1000;
  touch-action:none;
  transition:transform .25s ease;
}

/* 状態クラスで transform を切り替え */
.mp.hidden{ transform:translateY(100%); pointer-events:none; }
.mp.half  { transform:translateY(50%);  pointer-events:auto; }
.mp.full  { transform:translateY(0);    pointer-events:auto; }

/* ─ handle + header ─ */
.hdr{ display:flex; align-items:center; gap:.5rem;
      padding:.75rem 1rem .5rem; user-select:none; cursor:grab; }
.hdr:active{ cursor:grabbing; }
.handle{ position:absolute; top:6px; left:50%; width:40px; height:4px;
         margin-left:-20px; border-radius:4px; background:#c1c1c1; }
.ico { font-size:32px; flex-shrink:0; }
.ttl { flex:1; font-size:1rem; font-weight:600; line-height:1.3; }
.cls { color:#666; }
.cls:hover{ color:#000; }

/* ─ body ─ */
.bod{ flex:1; overflow-y:auto; padding:1rem;
      font-size:.875rem; line-height:1.6; }
</style>
