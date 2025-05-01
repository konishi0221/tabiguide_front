// public/js/pcm-processor.js   48 kHz / mono
class PCMProcessor extends AudioWorkletProcessor {
  constructor () { super(); this.buf = new Int16Array(4800); this.pos = 0; this.silent = 0 }
  process (inputs) {
    const src = inputs[0][0]; if (!src) return true

    /* 無音判定 (RMS) */
    let p = 0; for (let s of src) p += s * s
    const silentFrame = Math.sqrt(p / src.length) < 0.008

    if (silentFrame) {
      this.silent += src.length
      if (this.silent < 28800) return true          // 0.6 s (= 48 kHz×600 ms)
    } else this.silent = 0

    /* ここまで来たら “文末” なのでバッファを送出 */
    for (let i of src) {
      let v = i * 0x7fff * 3
      if (v > 32767) v = 32767
      if (v < -32768) v = -32768
      this.buf[this.pos++] = v
      if (this.pos === 4800) {
        this.port.postMessage({ type:'chunk', buf:this.buf })
        this.pos = 0
      }
    }
    /* 文末マーカーを付けて送る */
    this.port.postMessage({ type:'flush' })
    return true
  }
}
registerProcessor('pcm-processor', PCMProcessor)
