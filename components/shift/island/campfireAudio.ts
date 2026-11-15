/** Quiet, locally synthesised embers. No audio downloads or microphone access. */
export function createCampfireAudio(): AudioContext {
  const context = new AudioContext();
  // A long loop of low, rolling embers with soft, scattered wood crackles.
  const buffer = context.createBuffer(1, context.sampleRate * 24, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let ember = 0;
  for (let i = 0; i < samples.length; i++) {
    ember = (ember + (Math.random() * 2 - 1) * 0.025) / 1.025;
    samples[i] = ember * 2;
  }
  for (let i = 0; i < 95; i++) {
    const start = Math.floor(Math.random() * samples.length);
    const length = Math.floor(context.sampleRate * (0.006 + Math.random() * 0.025));
    const strength = 0.04 + Math.random() * 0.12;
    for (let j = 0; j < length && start + j < samples.length; j++) {
      samples[start + j] += (Math.random() * 2 - 1) * strength * Math.sin(Math.PI * j / length) * Math.exp(-4 * j / length);
    }
  }
  // Meet at zero so the loop boundary does not click.
  const fade = Math.floor(context.sampleRate * 0.04);
  for (let i = 0; i < fade; i++) {
    samples[i] *= i / fade;
    samples[samples.length - 1 - i] *= i / fade;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  const volume = context.createGain();
  volume.gain.setValueAtTime(0, context.currentTime);
  volume.gain.linearRampToValueAtTime(0.28, context.currentTime + 0.6);
  source.connect(filter).connect(volume).connect(context.destination);
  source.start();
  return context;
}
