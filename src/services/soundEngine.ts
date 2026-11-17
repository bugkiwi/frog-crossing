/**
 * Kid-friendly Sound Synthesizer using Web Audio API
 * Generates all game sound effects procedurally with zero external asset dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public unlock() {
    this.initCtx();
  }

  /**
   * Correct keystroke: crisp pleasant wooden/crystal tap that pitches up with combo!
   */
  public playKeyCorrect(combo: number = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseFreq = 520;
    const freq = baseFreq + Math.min(combo * 28, 480);
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Typo / error: gentle low thud that is soft and not discouraging
   */
  public playKeyError() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.35 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Frog jump: energetic spring/boing sound
   */
  public playJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.22);

    gain.gain.setValueAtTime(0.35 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Frog Croak: cute "呱~呱~!"
   */
  public playFrogCroak() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Two rapid pulses resembling frog croaking
    [0, 0.12].forEach((offset) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now + offset);
      osc.frequency.linearRampToValueAtTime(110, now + offset + 0.09);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now + offset);
      filter.Q.setValueAtTime(5, now + offset);

      gain.gain.setValueAtTime(0.35 * this.volume, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });
  }

  /**
   * Water splash sound when falling into the river
   */
  public playSplash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  /**
   * Successfully crossed bank: cheerful ascending chime!
   */
  public playReachBank() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.3 * this.volume, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.38);
    });
  }

  /**
   * Round Clear celebration fanfare
   */
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 523.25, d: 0.15, t: 0.16 },
      { f: 523.25, d: 0.15, t: 0.32 },
      { f: 659.25, d: 0.25, t: 0.48 },
      { f: 783.99, d: 0.25, t: 0.74 },
      { f: 1046.5, d: 0.55, t: 1.0 }
    ];

    notes.forEach((item) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(item.f, now + item.t);

      gain.gain.setValueAtTime(0.4 * this.volume, now + item.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + item.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + item.t);
      osc.stop(now + item.t + item.d + 0.05);
    });
  }
}

export const soundEngine = new SoundEngine();
