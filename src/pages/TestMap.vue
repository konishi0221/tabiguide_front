<template>
  <div id="map" class="h-screen w-screen"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Loader }     from '@googlemaps/js-api-loader'

onMounted(async () => {
  /* ① Maps JS をロード（libraries: 'marker' がポイント） */
  const loader = new Loader({
    apiKey : import.meta.env.VITE_GOOGLE_MAPS_KEY,
    version: 'weekly',
    libraries:['marker']           // ← Advanced Marker が入った v=beta 以降なら OK
  })
  const google = await loader.load()

  /* ② 地図を 1 枚生成 */
  const map = new google.maps.Map(document.getElementById('map'), {
    center : { lat: 35.6812, lng: 139.7671 }, // 東京駅
    zoom   : 14,
    mapId  : 'DEMO_MAP'                      // 任意
  })

  /* ③ Advanced Marker を 1 本 */
  const { AdvancedMarkerElement } = google.maps.marker

  new AdvancedMarkerElement({
    map,
    position:{ lat: 35.6812, lng: 139.7671 },
    title: '東京駅',
    /** 最小限のカスタムピン */
    content: (() => {
      const div = document.createElement('div')
      div.className = 'adv-pin'
      div.style.setProperty('--c', '#ff3b30')   // ピンの色
      div.innerHTML = `<span class="material-symbols-outlined">train</span>`
      return div
    })()
  })
})
</script>

<style scoped>
/* ▽ 超シンプルなピン用スタイル（Tailwind を使わない前提） */
.adv-pin{
  --c:#007bff;                 /* JS から上書きする前のデフォ色 */
  width:40px; height:46px;
  border-radius:10px 10px 0 0;
  background:var(--c);
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:26px;
  box-shadow:0 3px 6px rgba(0,0,0,.25);
  transform:translateY(-50%);  /* ピンの “先端” をポイントに合わせる */
}
</style>
