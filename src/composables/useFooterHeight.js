// src/composables/useViewportHeight.js
import { onMounted, onBeforeUnmount } from 'vue'

export function useViewportHeight () {
  const update = () => {
    const trueVh = window.innerHeight;    // これだけ！
    document.documentElement.style.setProperty('--100vh', `${trueVh}px`)
    // document.documentElement.style.setProperty('--100vh', `${trueVh}px`)
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', update)
  })
}
