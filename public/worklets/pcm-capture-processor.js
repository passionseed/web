/**
 * AudioWorkletProcessor that captures raw mono Float32 PCM chunks directly
 * from the Web Audio graph and streams them to the main thread with zero-copy
 * transferable buffers alongside per-chunk peak and RMS levels.
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._chunkSize = 2048;
    this._buffer = new Float32Array(this._chunkSize);
    this._offset = 0;
    this._peak = 0;
    this._sumSq = 0;
    this._active = true;

    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "stop") {
        this._flush();
        this._active = false;
      }
    };
  }

  _flush() {
    if (this._offset === 0) return;
    const out = this._buffer.slice(0, this._offset);
    const rms = Math.sqrt(this._sumSq / this._offset);
    const peak = this._peak;
    this.port.postMessage({ type: "chunk", samples: out, peak, rms }, [out.buffer]);
    this._offset = 0;
    this._peak = 0;
    this._sumSq = 0;
  }

  process(inputs) {
    if (!this._active) return false;
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    for (let i = 0; i < channel.length; i++) {
      const s = channel[i];
      this._buffer[this._offset++] = s;
      const abs = s < 0 ? -s : s;
      if (abs > this._peak) this._peak = abs;
      this._sumSq += s * s;

      if (this._offset >= this._chunkSize) {
        this._flush();
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
