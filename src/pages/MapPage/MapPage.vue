<!-- src/pages/MapPage/MapPage.vue -->
<template>
  <div class="map-container relative">
    <!-- ①カテゴリバー -->
    <nav id="category_bar" class="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-0
                bg-white/95 backdrop-blur-md rounded-xl overflow-hidden shadow-lg"
         style=" max-width:calc(100vw - 40px); min-height:52px">
      <!-- 全て -->
      <button class=" button flex flex-col items-center gap-0.5 w-16 px-1.5 py-2 text-[10px]"
              :class="active==='all' && 'active'"
              @click="filter('all')">
        <span class="material-symbols-outlined text-[20px]">select_all</span>{{t('map.categories.all')}}
      </button>
      <!-- 各カテゴリ -->
      <div class="border-l category-bar flex overflow-x-auto flex-1 space-x-0.5 pl-0.5 pr-0 snap-x snap-mandatory">
        <button v-for="c in categories" :key="c.id"
                class="button snap-start flex flex-col items-center gap-0.5  px-1.5 py-2 text-[10px] transition hover:bg-neutral-50"
                :class="active===c.id && 'active'"
                @click="filter(c.id)">
          <span class="text material-symbols-outlined text-[20px]">{{ c.icon }}</span>{{ c.name }}
        </button>
      </div>
      <!-- フェード -->
      <div class="absolute inset-y-0 right-0 w-6 flex items-center justify-end bg-gradient-to-l via-white/60 to-transparent pr-0.5">
        <span class="material-symbols-outlined text-sm text-neutral-400">chevron_right</span>
      </div>
    </nav>

    <!-- ②詳細パネル -->
    <MapPanel v-model:point="selected" @close="handlePanelClose"/>

    <!-- ③Google Map -->
    <div id="map" class=""></div>
  </div>
</template>


<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute }                 from 'vue-router'
import axios                        from 'axios'
import { Loader }                   from '@googlemaps/js-api-loader'
import MapPanel                     from '@/widgets/MapPanel.vue'
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()   // ← locale を取得

// Pinia デザインストア
import { useDesignStore } from '@/stores/design'
const designStore = useDesignStore()

/* ───── 状態 ───── */
const active     = ref('all')
const selected   = ref(null)
const points     = ref([])      // 施設 + スポット
const markers    = []           // Google マーカー
let   map, google, currentMarker = null

/* ───── 定数 ───── */
const categories = ref([])

/* 宿泊施設（ホームピン） */
const homeStore = reactive({
  id:'home', name:'現在地', category:'home',
  description:'', lat:35.6812, lng:139.7671, color:'#000', icon:'home'
})

/* ───── URL パラメータ ───── */
const route   = useRoute()
const pageUid = route.params.pageUid ?? route.query.pageUid ?? null   // /:pageUid/map

/* ───── 初期化 ───── */
onMounted(async ()=>{
  // i18n のロード後にカテゴリを生成
  categories.value = [
    { id: 'tour',       name: t('map.categories.tour'),       icon: 'photo_camera',            color: '#007bff' },
    { id: 'conveni',    name: t('map.categories.conveni'),    icon: 'local_convenience_store', color: '#ff3b30' },
    { id: 'essentials', name: t('map.categories.essentials'), icon: 'shopping_bag',            color: '#4caf50' },
    { id: 'laundry',    name: t('map.categories.laundry'),    icon: 'local_laundry_service',   color: '#00bcd4' },
    { id: 'parking',    name: t('map.categories.parking'),    icon: 'local_parking',           color: '#9c27b0' },
    { id: 'restaurant', name: t('map.categories.restaurant'), icon: 'restaurant',              color: '#795548' },
    { id: 'cafe',       name: t('map.categories.cafe'),       icon: 'local_cafe',              color: '#6d4c41' }
  ]

  if (pageUid) await designStore.fetch(pageUid)
  await fetchFacility()          // 宿泊施設
  await fetchStores()            // 周辺スポット
  await initMap()                // Google Map
  addMarkers()                   // マーカー描画
})

/* ───── API 呼び出し ───── */
async function fetchFacility () {
  if (!pageUid){
    points.value = [ homeStore ]
    return
  }

  const endpoint = '/api/facility.php'

  try{
    const { data } = await axios.get(endpoint, {
      params: { page_uid: pageUid, lang: locale.value }
    })
    const base = JSON.parse(data.base_data) ?? {}
    const geo  = JSON.parse(data.geo_data)  ?? {}

    const lat = parseFloat(geo['緯度'])
    const lng = parseFloat(geo['経度'])

    if (Number.isNaN(lat) || Number.isNaN(lng)){
      console.error('緯度経度が不正', geo)
    }

    Object.assign(homeStore,{
      name       : base['施設名']  || '',
      description: base['紹介文'] || 'あなたの宿泊施設です。',
      lat:lat, lng:lng,
    })

    points.value = [ homeStore ]

  }catch(err){
    console.error('facility load error', err)
  }
}


/* ───── Google Map ───── */
async function initMap(){
  const loader = new Loader({
    apiKey  : import.meta.env.VITE_GOOGLE_MAPS_KEY,
    version :'weekly',
    libraries:['marker']
  })
  google = await loader.load()

  const home = homeStore
  const lat = home.lat
  const lng = home.lng


  map = new google.maps.Map(document.getElementById('map'),{
    center:{ lat, lng },
    zoom:14, mapId:'DEMO_MAP',
    mapTypeControl:false, fullscreenControl:false, streetViewControl:false,
    zoomControl:false, rotateControl:false, scaleControl:false,
    keyboardShortcuts:false, clickableIcons:false, gestureHandling:'greedy'
  })
}


async function fetchStores () {
  try{
    const endpoint = '/api/stores.php'
    const { data } = await axios.get(endpoint, { params:{ fid:pageUid , lang: locale.value } })

    /* data は配列想定。緯度経度を数値化してフィルタ */
    const storePoints = (Array.isArray(data)?data:[])
      .map(s=>({
        ...s,
        lat:Number(s.lat ?? s.緯度),
        lng:Number(s.lng ?? s.経度)
      }))
      .filter(s=>!Number.isNaN(s.lat)&&!Number.isNaN(s.lng))

    points.value.push(...storePoints)

  }catch(err){
    console.error('stores load error', err)
  }
}


/* ───── マーカー描画 ───── */
function addMarkers(){
  const { AdvancedMarkerElement } = google.maps.marker
  let currentPin = null

  points.value.forEach(p=>{
    // ① アイコンと色を決定
    let iconValue, colorValue

    if (p.category === 'home') {
      iconValue  = designStore.data.logo_base64
        ? `data:image/png;base64,${designStore.data.logo_base64}`
        : 'home'
      colorValue = p.color || homeStore.color
    } else {
      const catDef = categories.value.find(c=>c.id===p.category)
      iconValue  = catDef ? catDef.icon : (p.icon || 'location_on')
      colorValue = catDef ? catDef.color : (p.color || '#000')
    }

    // ② Pin要素を作成
    const pin = createPin(colorValue, iconValue)

    // ③ マーカー生成
    const m = new AdvancedMarkerElement({
      map,
      position: { lat: p.lat, lng: p.lng },
      title: p.name,
      content: pin,
      zIndex: p.category === 'home' ? 9999 : undefined
    })

    // ④ m が定義された後に cat をセット
    m.cat   = p.category
    m.pinEl = pin

    // ⑤ クリックリスナー
    m.addListener('gmp-click', () => {
      recenterMap(m)
      if (currentPin) currentPin.classList.remove('active')
      pin.classList.add('active')
      currentPin     = pin
      selected.value = p
      currentMarker  = m
    })

    markers.push(m)
  })

  // ⑥ 初期フィルター再適用
  filter(active.value)
}

/* ───── 位置調整・フィルタ ───── */
function recenterMap(marker){
  const proj  = map.getProjection()
  const scale = 2 ** map.getZoom()
  const wpt   = proj.fromLatLngToPoint(marker.position)
  const offsetY = (innerHeight/4 - 50)/scale
  map.panTo(proj.fromPointToLatLng({ x:wpt.x, y:wpt.y+offsetY }))
}

function handlePanelClose(){
  selected.value = null
  if(currentMarker) map.panTo(currentMarker.position)
}

function filter(id){
  active.value = id
  markers.forEach(m=>{
    m.map = (m.cat==='home'|| id==='all'|| m.cat===id) ? map : null
  })
}

/* ───── ピン生成 ───── */
function createPin(color, icon){
  const el = document.createElement('div')
  el.className = 'adv-pin'
  el.style.setProperty('--c', color)

  if (typeof icon === 'string' && icon.startsWith('data:')) {
    // Base64 画像アイコン
    const img = document.createElement('img')
    img.src = icon
    img.style.width        = '100%'
    img.style.height       = '100%'
    img.style.borderRadius = '50%'
    el.appendChild(img)
  } else {
    // 文字アイコン（material-symbols）
    el.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`
  }

  return el
}

// サムネイルURL
const imgUrl = computed(() => {
  const p = props.point
  if (!p?.facility_uid || !p?.uid) return ''
  const base = import.meta.env.VITE_UPLOAD_BASE
  return `${base}/upload/${p.facility_uid}/stores/${p.uid}.jpg`
})
</script>

<style >
#map {
  height: var(--100vh);
  z-index: 0;
}
.adv-pin{
  --c:#007bff;
  width:40px;height:40px;border-radius:50%;
  background:var(--c);color:#fff;font-size:26px;
  display:flex;align-items:center;justify-content:center;
  transform:translateY(-50%);box-shadow:0 3px 6px rgba(0,0,0,.25);
  transition:.2s;
  border:solid 2px var(--c);
}
.adv-pin.active{
  transform:translateY(-50%) scale(1.25);
  box-shadow:0 6px 12px rgba(0,0,0,.3);
  z-index:1;
}
.adv-pin::after{
  content:'';position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);
  border-left:6px solid transparent;border-right:6px solid transparent;
  border-top:8px solid var(--c);
}
/* 横スクロールバー非表示 */
.category-bar{
  -webkit-overflow-scrolling:touch; scrollbar-width:none;
  overflow-x: scroll;
  width:calc(100%)
}
.category-bar::-webkit-scrollbar{ display:none; }
.category-bar button.button{
  width:calc(70px);
}

.category-bar .text {
  white-space: nowrap;
  height: 20px;
  width:calc(70px)
}

#category_bar {
  position: fixed;
  top: 20px;
}

button.active {
  border-bottom:solid 3px var(--secondary-color);
}
</style>
