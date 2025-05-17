<template>
  <div class="map-bubble" @click="open">
    <img :src="imgSrc" :alt="`map ${mapKey}`" class="map-img" />
    <div
      v-for="(p,idx) in pins"
      :key="idx"
      class="pin"
      :style="{ left:p.x_pct+'%', top:p.y_pct+'%' }"
    ></div>

    <!-- viewer modal -->
    <Teleport to="body">
      <div v-if="showViewer" class="viewer-mask" @click.self="close">
        <div class="viewer-body">
          <button
            class="close-btn"
            @click.stop.prevent="close"
            @touchstart.stop.prevent="close"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
          <!-- panzoom target -->
          <div class="pz-wrap" ref="wrap">
            <img :src="imgSrc" class="pz-img" />
            <div
              v-for="(p,idx) in pins"
              :key="idx"
              class="pin"
              :style="{ left:p.x_pct+'%', top:p.y_pct+'%' }"
            ></div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import panzoom from 'panzoom'

const props = defineProps({
  pageUid: { type:String, required:true },
  mapJson: { type:Object, required:true }   // {map:'1', pins:[...]}
})

const mapKey = props.mapJson.map
const pins   = props.mapJson.pins || []
const GCS = 'https://storage.googleapis.com/tabiguide_uploads'
const imgSrc = `${GCS}/upload/${props.pageUid}/images/map/${mapKey}.jpg`

/* viewer */
const showViewer = ref(false)
function open(){ showViewer.value = true }
function close(){
  showViewer.value = false;
}

const wrap = ref(null)

watch(showViewer, v=>{
  if(v){
    nextTick(()=>{
      const pz = panzoom(wrap.value, {
        maxScale : 5,
        minScale : 1,
        contain  : 'inside',
        bounds   : true,
        boundsPadding : 0.1,
        // beforeWheel is called for mouse‑wheel & pinch gestures
        beforeWheel: (e, delta) => {
          const cur = pz.getTransform().scale
          // block all attempts that would make scale below 1
          if (delta > 0 && cur <= 1) return true   // cancel
          if (delta > 0 && cur - 0.05 < 1) {       // tiny step left
            pz.zoomAbs(0,0,1)                      // snap
            return true
          }
          return false
        }
      })

      
      let adjusting = false
      pz.on('zoom', () => {
        const s = pz.getTransform().scale
        if (!adjusting && s < 1) {
          adjusting = true
          // snap back to exactly 1 and recenter
          pz.zoomAbs(0, 0, 1)
          pz.moveTo(0, 0)        // recenter so image doesn't drift to corner
          adjusting = false
        }
      })
      pz.on('pan', () => {
        const t = pz.getTransform()
      })
    })
  }
})
</script>

<style scoped>
.map-bubble{
  position:relative;
  display:inline-block;
  /* max-width:250px; */
  cursor:pointer;
}
.map-img{
  width:100%;
  height:auto;
  display:block;
  border-radius:6px;
}
.pin{
  position:absolute;
  width:12px;
  height:12px;
  background:#ff3b30;
  border-radius:50%;
  transform:translate(-50%,-50%);
}
.viewer-mask{
  position:fixed; inset:0; background:#0008; display:flex; align-items:center; justify-content:center; z-index:9999;
}
.viewer-body{
  position:relative;
  width:90vw;
  height:90vh;
  background:#fff;
  border-radius:8px;
  overflow:hidden;
  /* center panzoom target */
  display:flex;
  align-items:center;
  justify-content:center;
}
.close-btn{
  pointer-events:auto;
  position:absolute;
  top:12px;
  right:12px;
  width:36px;
  height:36px;
  border:none;
  border-radius:50%;
  background:#ffffff;
  font-size:24px;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  box-shadow:0 2px 6px rgba(0,0,0,.25);
  z-index:10;
  pointer-events:auto;
  z-index: 50; /* ensure over panzoom canvas */
}
.close-btn .material-symbols-outlined{
  font-size:24px;
}
.close-btn:hover{
  background:#f0f0f0;
}
.pz-wrap{
  position:relative;
  display:inline-block;
}
.pz-img{
  display:block;
  width:100%;
  height:auto;
}
</style>