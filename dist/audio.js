/** Original, quiet procedural ambience. No audio files or network requests. */
export function createCampAudio() {
  let context = null;
  let master = null;
  let tracks = null;
  let startPromise = null;
  let destroyed = false;
  let muted = true;
  let volume = 0.45;
  let scene = { weather: 'sunny', fireLit: false, hour: 15 };
  const sources = new Set();
  const effectNodes = new Set();

  function smooth(parameter, value, seconds = 0.3) {
    if (!context || !parameter) return;
    const now = context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(value, now, seconds);
  }

  function applyMaster() {
    if (master) smooth(master.gain, muted ? 0 : volume * 0.4, 0.045);
  }

  function applyScene() {
    if (!tracks) return;
    const weather = String(scene.weather || '').toLowerCase();
    const rainy = /rain|storm|雨/.test(weather);
    const windy = /wind|storm|风/.test(weather);
    smooth(tracks.rain.gain, rainy ? 0.2 : 0, 0.65);
    smooth(tracks.wind.gain, windy ? 0.13 : rainy ? 0.07 : 0.04, 0.8);
    smooth(tracks.stream.gain, rainy ? 0.025 : 0.045, 0.65);
    smooth(tracks.fire.gain, scene.fireLit ? 0.095 : 0, 0.45);
  }

  function buildGraph() {
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    // Shared original noise is reused with different offsets and filters.
    const noise = context.createBuffer(2, Math.ceil(context.sampleRate * 4), context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = noise.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      // Meet the ends gently so the repeating buffer has no click.
      const edge = Math.min(192, Math.floor(data.length / 2));
      for (let i = 0; i < edge; i += 1) {
        const fade = i / edge;
        data[i] *= fade;
        data[data.length - i - 1] *= fade;
      }
    }

    function noiseTrack(type, frequency, highpass, offset) {
      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const low = context.createBiquadFilter();
      low.type = type;
      low.frequency.value = frequency;
      low.Q.value = type === 'bandpass' ? 0.5 : 0.65;
      const high = context.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = highpass;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(low);
      low.connect(high);
      high.connect(gain);
      gain.connect(master);
      sources.add(source);
      source.start(0, offset);
      return gain;
    }

    tracks = {
      rain: noiseTrack('lowpass', 2100, 300, 0.1),
      wind: noiseTrack('lowpass', 440, 75, 1.1),
      stream: noiseTrack('bandpass', 1350, 500, 2.1),
      fire: noiseTrack('lowpass', 1050, 180, 3.1),
    };
    // A very shallow slow modulation gives the breeze and fire a soft pulse.
    // It does not introduce sharp, startling crackles.
    for (const [name, rate, depth] of [['wind', 0.12, 0.007], ['fire', 1.3, 0.004]]) {
      const oscillator = context.createOscillator();
      const amount = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = rate;
      amount.gain.value = depth;
      // Modulate a second gain, never the enable/disable gain of the track.
      const pulse = context.createGain();
      pulse.gain.value = 0.95;
      tracks[name].disconnect();
      tracks[name].connect(pulse);
      pulse.connect(master);
      oscillator.connect(amount);
      amount.connect(pulse.gain);
      sources.add(oscillator);
      oscillator.start();
    }
    applyScene();
    applyMaster();
  }

  async function start() {
    if (destroyed) return false;
    if (startPromise) return startPromise;
    // The caller invokes start directly from a click/tap. Construction stays
    // synchronous before the first await so the browser can use that gesture.
    startPromise = (async () => {
      try {
        if (!context) {
          const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
          if (!AudioContextClass) return false;
          context = new AudioContextClass();
          buildGraph();
        }
        if (context.state !== 'running') await context.resume();
        if (destroyed) return false;
        applyMaster();
        return context.state === 'running';
      } catch {
        // An unsupported or blocked audio device must not interrupt the game.
        return false;
      }
    })();
    try {
      return await startPromise;
    } finally {
      startPromise = null;
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    applyMaster();
  }

  function setVolume(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    volume = Math.max(0, Math.min(1, parsed));
    applyMaster();
  }

  function update(next = {}) {
    if (destroyed || !next || typeof next !== 'object') return;
    scene = { ...scene, ...next };
    applyScene();
  }

  function effect(name) {
    if (destroyed || muted || volume === 0 || !context || context.state !== 'running') return;
    const melodies = {
      place: [[392, 0, 0.12], [523.25, 0.07, 0.15]],
      cook: [[329.63, 0, 0.14], [392, 0.1, 0.14], [523.25, 0.2, 0.18]],
      success: [[392, 0, 0.16], [493.88, 0.11, 0.16], [587.33, 0.22, 0.25]],
      error: [[293.66, 0, 0.16], [261.63, 0.12, 0.19]],
    };
    const notes = melodies[name];
    if (!notes || effectNodes.size > 15) return;
    const now = context.currentTime;
    for (const [frequency, delay, duration] of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const begin = now + delay;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, begin);
      gain.gain.linearRampToValueAtTime(0.12, begin + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, begin + duration);
      oscillator.connect(gain);
      gain.connect(master);
      effectNodes.add(oscillator);
      oscillator.onended = () => {
        effectNodes.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(begin);
      oscillator.stop(begin + duration + 0.025);
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const source of [...sources, ...effectNodes]) {
      try { source.stop(); } catch { /* Already stopped. */ }
      try { source.disconnect(); } catch { /* Already disconnected. */ }
    }
    sources.clear();
    effectNodes.clear();
    if (master) master.disconnect();
    if (context) context.close().catch(() => {});
    tracks = null;
    master = null;
  }

  return { start, setMuted, setVolume, update, effect, destroy };
}
