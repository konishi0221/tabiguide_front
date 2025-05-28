

/**
 * whisper.js – Audio pre‑processing helpers for Whisper WASM
 * ----------------------------------------------------------
 * ここでは録音ストリームに対するサンプルレート変換や音量正規化など、
 * Whisper 推論前の調整ロジックだけをまとめる。
 *
 * 他のファイル（call.js など）は「録音 → Uint8Array」を渡すだけにし、
 * 具体的なフィルター処理は本モジュールに集約する。
 */

/* ===== Constants ===== */
export const TARGET_SAMPLE_RATE = 16000;      // Whisper tiny/base が期待する SR
export const TARGET_PEAK_dBFS   = -1.0;       // 0 dBFS に対して -1 dB まで持ち上げる
const EPS = 1e-12;

/* ===== Utility: convert Web Audio buffer → Float32Array ===== */
export function audioBufferToFloat32 (audioBuffer) {
  if (audioBuffer.numberOfChannels === 1) return audioBuffer.getChannelData(0);
  // stereo → mono (L+R)/2
  const len = audioBuffer.length;
  const out = new Float32Array(len);
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.getChannelData(1);
  for (let i = 0; i < len; i++) out[i] = (ch0[i] + ch1[i]) * 0.5;
  return out;
}

/* ===== Utility: linear resample to 16 kHz ===== */
export function resampleLinear (pcmFloat32, origSampleRate) {
  if (origSampleRate === TARGET_SAMPLE_RATE) return pcmFloat32;
  const ratio = TARGET_SAMPLE_RATE / origSampleRate;
  const out = new Float32Array(Math.round(pcmFloat32.length * ratio));
  for (let i = 0; i < out.length; i++) {
    const idx = i / ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, pcmFloat32.length - 1);
    const frac = idx - i0;
    out[i] = pcmFloat32[i0] * (1 - frac) + pcmFloat32[i1] * frac;
  }
  return out;
}

/* ===== Utility: simple peak normalize ===== */
export function normalizePeak (pcmFloat32, targetDb = TARGET_PEAK_dBFS) {
  // peak amplitude
  let peak = EPS;
  for (let i = 0; i < pcmFloat32.length; i++) {
    const v = Math.abs(pcmFloat32[i]);
    if (v > peak) peak = v;
  }
  const targetAmp = Math.pow(10, targetDb / 20);
  const gain = targetAmp / peak;
  if (gain >= 1.0) return pcmFloat32;          // already <= target
  const out = new Float32Array(pcmFloat32.length);
  for (let i = 0; i < pcmFloat32.length; i++) out[i] = pcmFloat32[i] * gain;
  return out;
}

/* ===== Pipeline helper ===== */
/**
 * processAudio(blob|Uint8Array, origSampleRate) → Float32Array (16 kHz, peak‑norm)
 */
export async function processAudio (input, origSampleRate = 48000) {
  let pcm;
  if (input instanceof Uint8Array) {
    pcm = input; // assume already Float32 PCM
  } else {
    // Decode via Web Audio
    const ctx = new OfflineAudioContext(1, 1, origSampleRate);
    const ab  = input instanceof Blob ? await input.arrayBuffer() : input;
    const audioBuf = await ctx.decodeAudioData(ab);
    pcm = audioBufferToFloat32(audioBuf);
    origSampleRate = audioBuf.sampleRate;
  }
  pcm = resampleLinear(pcm, origSampleRate);
  pcm = normalizePeak(pcm);
  return pcm;
}

/* ===== Export default object ===== */
export default {
  TARGET_SAMPLE_RATE,
  processAudio,
  resampleLinear,
  normalizePeak,
};