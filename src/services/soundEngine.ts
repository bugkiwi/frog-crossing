/**
 * Kid-friendly Sound Synthesizer using Web Audio API.
 * Uses smooth attack/release envelopes + master DynamicsCompressor to guarantee
 * warm, crisp SFX with zero clicks, pops, clipping, or buzzing static.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.75;
  private splashNoiseBuffer: AudioBuffer | null = null;

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master limiter/compressor prevents clipping or static when rapid SFX overlap
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      compressor.knee.setValueAtTime(18, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      master.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.masterGain = master;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public unlock() {
    this.initCtx();
  }

  private getOutput(): AudioNode | null {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return null;
    return this.masterGain;
  }

  /**
   * Correct keystroke / word match: crisp, warm marimba-like tap that pitches up with combo
   */
  public playKeyCorrect(combo: number = 0) {
    if (this.isMuted) return;
    const out = this.getOutput();
    if (!out || !this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreq = 520;
    const freq = baseFreq + Math.min(combo * 24, 420);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.07);

    // Smooth click-free envelope (0 -> peak -> 0.0001)
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Typo / voice retry: gentle soft low marimba thud (non-discouraging, zero click)
   */
  public playKeyError() {
    if (this.isMuted) return;
    const out = this.getOutput();
    if (!out || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(145, now + 0.14);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  /**
   * Frog jump: cheerful soft spring/boing sound
   */
  public playJump() {
    if (this.isMuted) return;
    const out = this.getOutput();
    if (!out || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Frog Croak: soft, cute double-bubble "ribbit" using smooth triangle wave (no harsh sawtooth buzz!)
   */
  public playFrogCroak() {
    if (this.isMuted) return;
    const out = this.getOutput();
    if (!out || !this.ctx) return;

    const now = this.ctx.currentTime;

    [0, 0.11].forEach((offset, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      const startF = idx === 0 ? 220 : 250;
      const endF = idx === 0 ? 310 : 350;
      osc.frequency.setValueAtTime(startF, now + offset);
      osc.frequency.exponentialRampToValueAtTime(endF, now + offset + 0.075);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now + offset);

      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.linearRampToValueAtTime(0.16, now + offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.085);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(now + offset);
      osc.stop(now + offset + 0.095);
    });
  }

  /**
   * Water splash sound when falling into the river (reuses cached noise buffer for zero GC hiccup)
   */
  public playSplash() {
    if (this.isMuted) return;
    const out = this.getOutput();
    if (!out || !this.ctx) return;

    const now = this.ctx.currentTime;
    if (!this.splashNoiseBuffer) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.36);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.splashNoiseBuffer = buffer;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.splashNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.32);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    noise.start(now);
    noise.stop(now + 0.35);
  }

  /**
   * Successfully crossed bank: cheerful ascending chime
   */
  public playReachBank() {
    if (this.isMuted) return;
    const out = this.getOutput();
    if (!out || !this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = now + idx * 0.085;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  /**
   * Round Clear celebration fanfare
   */
  public playVictoryFanfare() {
    if (this.isMuted) return;
    const out = this.getOutput();
    if (!out || !this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 523.25, d: 0.15, t: 0.16 },
      { f: 523.25, d: 0.15, t: 0.32 },
      { f: 659.25, d: 0.25, t: 0.48 },
      { f: 783.99, d: 0.25, t: 0.74 },
      { f: 1046.5, d: 0.52, t: 1.0 }
    ];

    notes.forEach((item) => {
      if (!this.ctx) return;
      const t = now + item.t;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(item.f, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + item.d);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t);
      osc.stop(t + item.d + 0.03);
    });
  }
}

export const soundEngine = new SoundEngine();
