/**
 * High-Clarity English Pronunciation Engine
 *
 * Tier 1 (Primary): Real native studio human pronunciation via cached HTML5 Audio
 *   - Natural human intonation, zero robotic stiffness, zero speechSynthesis buffer crackle.
 *   - Cached per word/phrase for instant repeat playback + gentle background preloading.
 *
 * Tier 2 (Seamless Offline Fallback): Smart-ranked Web Speech API
 *   - Prioritizes Neural/Natural/Enhanced/Siri/Google voices, blacklists robotic novelty voices.
 *   - Avoids Chrome's cancel-then-speak static bug with a clean cooldown and neutral pitch (1.0).
 */

const NOVELTY_VOICE_BLACKLIST = [
  'albert',
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'fred',
  'good news',
  'jester',
  'organ',
  'ralph',
  'trinoids',
  'whisper',
  'zarvox',
  'wobble',
  'superstar',
  'junior',
  'kathy',
  'eddy',
  'flo',
  'grandma',
  'grandpa',
  'reed',
  'rocko',
  'sandy',
  'shelley'
];

function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = (v.lang || '').toLowerCase();
  if (!lang.startsWith('en')) return -100;

  const name = (v.name || '').toLowerCase();
  if (NOVELTY_VOICE_BLACKLIST.some((bad) => name.includes(bad))) {
    return -50;
  }

  let score = 0;
  if (lang === 'en-us') score += 20;
  else if (lang === 'en-gb') score += 16;
  else score += 10;

  // Neural / Natural / Enhanced / Premium voices sound far more human
  if (name.includes('natural') || name.includes('neural')) score += 50;
  if (name.includes('enhanced') || name.includes('premium')) score += 45;
  if (name.includes('siri')) score += 42;
  if (name.includes('google us english')) score += 40;
  if (name.includes('google uk english')) score += 36;
  if (name.includes('aria') || name.includes('jenny') || name.includes('ava') || name.includes('allison')) score += 34;
  if (name.includes('samantha') || name.includes('daniel') || name.includes('karen')) score += 26;
  if (!v.localService) score += 8; // Cloud neural voices are generally cleaner

  return score;
}

function cleanPronunciationText(word: string): string {
  return word
    .replace(/[’]/g, "'")
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildHumanAudioUrl(cleanText: string): string {
  // type=2: clear standard American English native pronunciation (supports words & short phrases)
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=2`;
}

class SpeechEngine {
  private enabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;
  private isInitialized: boolean = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private activeAudio: HTMLAudioElement | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private ttsDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private speakSeq: number = 0;
  private onlineAudioBlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    let bestVoice: SpeechSynthesisVoice | null = null;
    let bestScore = -999;

    for (const v of voices) {
      const s = scoreVoice(v);
      if (s > bestScore) {
        bestScore = s;
        bestVoice = v;
      }
    }

    this.voice = bestVoice || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
    this.isInitialized = true;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  public stopAll() {
    this.speakSeq++;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.ttsDelayTimer) {
      clearTimeout(this.ttsDelayTimer);
      this.ttsDelayTimer = null;
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // Ignore pause errors
      }
      this.activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cancel errors
        }
      }
    }
    this.activeUtterance = null;
  }

  /**
   * Gently preload human pronunciation audio for upcoming unit words so playback is instant.
   */
  public preloadWords(words: string[]) {
    if (typeof window === 'undefined' || this.onlineAudioBlocked) return;
    const slice = words.slice(0, 8);
    for (const w of slice) {
      const clean = cleanPronunciationText(w);
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (this.audioCache.has(key)) continue;

      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = buildHumanAudioUrl(clean);
      this.putCache(key, audio);
    }
  }

  private putCache(key: string, audio: HTMLAudioElement) {
    if (this.audioCache.size >= 60) {
      const firstKey = this.audioCache.keys().next().value;
      if (firstKey) this.audioCache.delete(firstKey);
    }
    this.audioCache.set(key, audio);
  }

  private speakWithBrowserTts(cleanText: string, seq: number) {
    if (seq !== this.speakSeq) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!this.isInitialized) {
      this.initVoices();
    }

    const doSpeak = () => {
      if (seq !== this.speakSeq) return;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.voice) {
        utterance.voice = this.voice;
        utterance.lang = this.voice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }
      // Keep neutral pitch=1.0 to avoid metallic distortion; gentle natural pacing for kids
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Retain reference to avoid Chrome GC cutoff mid-word
      this.activeUtterance = utterance;
      utterance.onend = () => {
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
      };
      utterance.onerror = () => {
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        // Ignore TTS failure
      }
    };

    // Only cancel when actually speaking/pending, then wait 45ms to prevent Chrome static/crackle
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
      this.ttsDelayTimer = setTimeout(doSpeak, 45);
    } else {
      doSpeak();
    }
  }

  public speak(word: string, force: boolean = false) {
    if ((!this.enabled && !force) || typeof window === 'undefined') return;

    const cleanText = cleanPronunciationText(word);
    if (!cleanText) return;

    this.stopAll();
    const seq = this.speakSeq;

    // If online audio previously failed (e.g. offline mode), go straight to upgraded browser TTS
    if (this.onlineAudioBlocked || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      this.speakWithBrowserTts(cleanText, seq);
      return;
    }

    const key = cleanText.toLowerCase();
    let audio = this.audioCache.get(key);
    if (!audio) {
      audio = new Audio(buildHumanAudioUrl(cleanText));
      audio.preload = 'auto';
      this.putCache(key, audio);
    }

    this.activeAudio = audio;
    let settled = false;

    const triggerFallback = () => {
      if (settled || seq !== this.speakSeq) return;
      settled = true;
      if (this.fallbackTimer) {
        clearTimeout(this.fallbackTimer);
        this.fallbackTimer = null;
      }
      this.audioCache.delete(key);
      this.speakWithBrowserTts(cleanText, seq);
    };

    audio.onplaying = () => {
      if (seq !== this.speakSeq) return;
      settled = true;
      if (this.fallbackTimer) {
        clearTimeout(this.fallbackTimer);
        this.fallbackTimer = null;
      }
    };

    audio.onerror = () => {
      triggerFallback();
    };

    audio.onended = () => {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
      }
    };

    // Fallback swiftly if remote audio stalls > 1.4s (e.g. poor Wi-Fi)
    this.fallbackTimer = setTimeout(() => {
      if (!settled && audio && audio.paused) {
        triggerFallback();
      }
    }, 1400);

    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          triggerFallback();
        });
      }
    } catch {
      triggerFallback();
    }
  }
}

export const speechEngine = new SpeechEngine();
