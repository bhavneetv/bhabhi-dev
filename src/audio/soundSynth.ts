/**
 * Procedural Web Audio API sound synthesizer for Bhabhi Dever.
 * Zero external asset dependencies, zero latency, runs offline, cross-browser compatible.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  constructor() {
    // AudioContext will be initialized on first user interaction per browser autoplay policies
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public triggerHaptic(pattern: number | number[] = 50) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored if device doesn't support
      }
    }
  }

  /**
   * Crisp snap of a card landing on the felt table
   */
  public playCardSnap() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.05; // 50ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    // Subtle low thud
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.04);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5 * this.volume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    whiteNoise.start(t);
    osc.start(t);
    whiteNoise.stop(t + 0.05);
    osc.stop(t + 0.05);

    this.triggerHaptic(20);
  }

  /**
   * Fast paper whoosh when dealing cards
   */
  public playCardDeal() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);

    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Card selection subtle hover/lift tick
   */
  public playCardSelect() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.setValueAtTime(680, t + 0.02);

    gain.gain.setValueAtTime(0.12 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * THE THULLA MOMENT!
   * Massive dramatic cinematic explosion hit, bass drop, and metallic distortion crack
   */
  public playThullaBoom() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Sub Bass Drop (deep cinematic thump)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.6);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.9 * this.volume, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.7);

    // Distortion Impact Hit (Brass / Gong slap)
    const brassOsc = ctx.createOscillator();
    brassOsc.type = 'sawtooth';
    brassOsc.frequency.setValueAtTime(220, t);
    brassOsc.frequency.exponentialRampToValueAtTime(60, t + 0.4);

    const brassFilter = ctx.createBiquadFilter();
    brassFilter.type = 'lowpass';
    brassFilter.frequency.setValueAtTime(2500, t);
    brassFilter.frequency.exponentialRampToValueAtTime(200, t + 0.45);

    const brassGain = ctx.createGain();
    brassGain.gain.setValueAtTime(0.7 * this.volume, t);
    brassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    brassOsc.connect(brassFilter);
    brassFilter.connect(brassGain);
    brassGain.connect(ctx.destination);
    brassOsc.start(t);
    brassOsc.stop(t + 0.5);

    // Noise Crash
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(600, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.4);

    // Epic Haptic Vibration pulse
    this.triggerHaptic([80, 50, 120, 40, 200]);
  }

  /**
   * Picking up cards after a Thulla
   */
  public playPickup() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    });

    this.triggerHaptic([40, 40, 40]);
  }

  /**
   * Player turn ding
   */
  public playTurnChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [659.25, 830.61].forEach((freq, idx) => {
      const noteTime = t + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3 * this.volume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.26);
    });

    this.triggerHaptic(40);
  }

  /**
   * Urgent alarm when opponent or player reaches 1 card remaining
   */
  public playWarningAlarm() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(987.77, t + 0.08);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);

    this.triggerHaptic([60, 40, 60]);
  }

  /**
   * Victory fanfare for the 1st safe player
   */
  public playVictory() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.5, d: 0.35 }, // C6
    ];

    let t = ctx.currentTime;
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.4 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.02);
      t += note.d * 0.9;
    });

    this.triggerHaptic([100, 50, 100, 50, 200]);
  }

  /**
   * Hilarious sad trombone wah-wah-wah-waaah for the BHABHI loser reveal!
   */
  public playBhabhiTrumpet() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [
      { f: 349.23, dur: 0.3 }, // F4
      { f: 329.63, dur: 0.3 }, // E4
      { f: 311.13, dur: 0.3 }, // Eb4
      { f: 293.66, dur: 0.8 }, // D4 (long sad tail with pitch drop)
    ];

    let t = ctx.currentTime;
    notes.forEach((note, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, t);

      // Add comic vibrato to the last note
      if (i === notes.length - 1) {
        osc.frequency.exponentialRampToValueAtTime(note.f * 0.85, t + note.dur);
      }

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);

      gain.gain.setValueAtTime(0.35 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + note.dur + 0.05);

      t += note.dur + 0.05;
    });

    this.triggerHaptic([150, 80, 150, 80, 300]);
  }

  /**
   * Smooth paper sweep whoosh for discarding clean tricks to the dead pile
   */
  public playDiscardSwoosh() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.25; // 250ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.22);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.25);

    this.triggerHaptic(30);
  }
}

export const soundSynth = new SoundSynthesizer();
