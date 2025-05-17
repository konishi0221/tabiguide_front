// src/lib/soundFilter.js
// 環境ノイズ軽減のためのハイパス＋ローパス＋Analyser をまとめて作成
export function attachFilters (ctx, src) {
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 200      // 200 Hz 以下カット

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 4000     // 4 kHz 以上カット

  const ana = ctx.createAnalyser()
  ana.fftSize = 2048

  // src -> HP -> LP -> Analyser
  src.connect(hp).connect(lp).connect(ana)

  // 後始末用
  const cleanup = () => {
    try { hp.disconnect(); lp.disconnect(); ana.disconnect() } catch {}
  }
  return { ana, cleanup }
}

/**
 * gap 秒以上の無音で録音停止し Blob を返すユーティリティ。
 * ノイズと判断した場合は null を返す。
 *
 * @param {Object} opts
 * @param {number} opts.gap   無音判定までの秒数
 * @param {number} opts.level ノイズゲート倍率 (default 1.4)
 * @param {MediaStream|null} opts.stream 既存ストリームを再利用する場合
 * @returns {Promise<Blob|null>}
 */
export async function recordUntilSilence ({ gap = 0.5, level = 1.4, stream = null } = {}) {
  const ownStream = !stream
  const mediaStream = stream || await navigator.mediaDevices.getUserMedia({ audio: true })
  const ctx    = new AudioContext()
  const src    = ctx.createMediaStreamSource(mediaStream)

  const { ana, cleanup } = attachFilters(ctx, src)
  const buf = new Uint8Array(ana.fftSize)

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : ''
  const rec = mimeType
    ? new MediaRecorder(mediaStream, { mimeType })
    : new MediaRecorder(mediaStream)

  const chunks = []
  rec.ondataavailable = e => chunks.push(e.data)
  rec.start()

  let silent = 0, baseNoise = 0
  const warmupUntil = Date.now() + 800
  const iv = setInterval(() => {
    ana.getByteTimeDomainData(buf)
    const vol = Math.max(...buf) - 128
    if (Date.now() < warmupUntil) {
      if (vol > baseNoise) baseNoise = vol
      return
    }
    const gate = baseNoise * level
    silent = vol < gate ? silent + 50 : 0
    if (silent >= gap * 1000) {
      clearInterval(iv)
      rec.stop()
    }
  }, 50)

  return await new Promise(resolve => {
    rec.onstop = async () => {
      if (ownStream) {
        mediaStream.getTracks().forEach(t => t.stop())
      }
      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
      try { src.disconnect(); cleanup(); ctx.close?.() } catch {}

      // 雑音チェック
      try {
        const ab   = await blob.arrayBuffer()
        const aCtx = new AudioContext()
        const aBuf = await aCtx.decodeAudioData(ab)
        const ch   = aBuf.getChannelData(0)
        let sum = 0
        for (let i = 0; i < ch.length; i++) sum += Math.abs(ch[i])
        const avg = sum / ch.length
        aCtx.close?.()
        if (avg < 0.02) resolve(null)
        else            resolve(blob)
      } catch { resolve(null) }
    }
  })
}
